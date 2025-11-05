/**
 * SecurityManager.mjs
 * Manages security, encryption, and sensitive data handling
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';

class SecurityManager {
  constructor(db, options = {}) {
    this.db = db;
    this.secretsCollection = db.collection('secrets');
    this.auditLogCollection = db.collection('audit_logs');
    this.encryptionKey = options.encryptionKey || process.env.ENCRYPTION_KEY;
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext) {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not configured');
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        Buffer.from(this.encryptionKey, 'hex'),
        iv
      );

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        encrypted,
        authTag: authTag.toString('hex')
      };
    } catch (err) {
      console.error('Encryption failed:', err);
      throw err;
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not configured');
      }

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(this.encryptionKey, 'hex'),
        Buffer.from(encryptedData.iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (err) {
      console.error('Decryption failed:', err);
      throw err;
    }
  }

  /**
   * Store a secret securely
   */
  async storeSecret(secretName, secretValue, userId, metadata = {}) {
    try {
      const secretId = uuidv4();
      const encrypted = this.encrypt(secretValue);

      const secret = {
        _id: new ObjectId(),
        secretId,
        secretName,
        encrypted,
        userId,
        metadata,
        createdAt: new Date(),
        lastAccessed: null,
        accessCount: 0
      };

      await this.secretsCollection.insertOne(secret);

      // Log the action
      await this.logAudit({
        action: 'SECRET_STORED',
        secretId,
        userId,
        details: `Secret '${secretName}' stored securely`
      });

      return { secretId, status: 'stored' };
    } catch (err) {
      console.error('Failed to store secret:', err);
      throw err;
    }
  }

  /**
   * Retrieve a secret
   */
  async getSecret(secretId, userId) {
    try {
      const secret = await this.secretsCollection.findOne({ secretId });

      if (!secret) {
        throw new Error('Secret not found');
      }

      if (secret.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized access to secret');
      }

      // Update access information
      await this.secretsCollection.updateOne(
        { secretId },
        {
          $set: { lastAccessed: new Date() },
          $inc: { accessCount: 1 }
        }
      );

      // Log the access
      await this.logAudit({
        action: 'SECRET_ACCESSED',
        secretId,
        userId,
        details: `Secret '${secret.secretName}' accessed`
      });

      const decrypted = this.decrypt(secret.encrypted);

      return {
        secretId,
        secretName: secret.secretName,
        secretValue: decrypted,
        metadata: secret.metadata
      };
    } catch (err) {
      console.error('Failed to retrieve secret:', err);
      throw err;
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(secretId, userId) {
    try {
      const secret = await this.secretsCollection.findOne({ secretId });

      if (!secret) {
        throw new Error('Secret not found');
      }

      if (secret.userId.toString() !== userId.toString()) {
        throw new Error('Unauthorized deletion of secret');
      }

      await this.secretsCollection.deleteOne({ secretId });

      // Log the action
      await this.logAudit({
        action: 'SECRET_DELETED',
        secretId,
        userId,
        details: `Secret '${secret.secretName}' deleted`
      });

      return { success: true };
    } catch (err) {
      console.error('Failed to delete secret:', err);
      throw err;
    }
  }

  /**
   * Log audit trail
   */
  async logAudit(auditData) {
    try {
      const log = {
        _id: new ObjectId(),
        logId: uuidv4(),
        action: auditData.action,
        userId: auditData.userId,
        details: auditData.details || '',
        ipAddress: auditData.ipAddress || 'unknown',
        userAgent: auditData.userAgent || 'unknown',
        timestamp: new Date(),
        status: 'logged'
      };

      await this.auditLogCollection.insertOne(log);
    } catch (err) {
      console.error('Failed to log audit:', err);
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(userId, limit = 100) {
    try {
      const logs = await this.auditLogCollection
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return logs;
    } catch (err) {
      console.error('Failed to get audit logs:', err);
      throw err;
    }
  }

  /**
   * Generate API key
   */
  async generateAPIKey(userId, keyName) {
    try {
      const apiKey = crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const secret = {
        _id: new ObjectId(),
        secretId: uuidv4(),
        secretName: `API_KEY_${keyName}`,
        encrypted: this.encrypt(apiKey),
        userId,
        metadata: {
          type: 'api_key',
          keyName,
          keyHash,
          createdAt: new Date()
        },
        createdAt: new Date(),
        lastAccessed: null,
        accessCount: 0
      };

      await this.secretsCollection.insertOne(secret);

      // Log the action
      await this.logAudit({
        action: 'API_KEY_GENERATED',
        userId,
        details: `API key '${keyName}' generated`
      });

      return {
        apiKey,
        keyHash,
        secretId: secret.secretId
      };
    } catch (err) {
      console.error('Failed to generate API key:', err);
      throw err;
    }
  }

  /**
   * Validate API key
   */
  async validateAPIKey(apiKey) {
    try {
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const secret = await this.secretsCollection.findOne({
        'metadata.keyHash': keyHash,
        'metadata.type': 'api_key'
      });

      if (!secret) {
        return { valid: false };
      }

      // Update access information
      await this.secretsCollection.updateOne(
        { secretId: secret.secretId },
        {
          $set: { lastAccessed: new Date() },
          $inc: { accessCount: 1 }
        }
      );

      return {
        valid: true,
        userId: secret.userId,
        keyName: secret.metadata.keyName
      };
    } catch (err) {
      console.error('Failed to validate API key:', err);
      throw err;
    }
  }

  /**
   * Hash password
   */
  hashPassword(password) {
    try {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto
        .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
        .toString('hex');

      return `${salt}:${hash}`;
    } catch (err) {
      console.error('Failed to hash password:', err);
      throw err;
    }
  }

  /**
   * Verify password
   */
  verifyPassword(password, hash) {
    try {
      const [salt, originalHash] = hash.split(':');
      const newHash = crypto
        .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
        .toString('hex');

      return newHash === originalHash;
    } catch (err) {
      console.error('Failed to verify password:', err);
      throw err;
    }
  }

  /**
   * Get security statistics
   */
  async getSecurityStats(userId) {
    try {
      const secretCount = await this.secretsCollection.countDocuments({ userId });
      const auditLogCount = await this.auditLogCollection.countDocuments({ userId });
      const apiKeyCount = await this.secretsCollection.countDocuments({
        userId,
        'metadata.type': 'api_key'
      });

      return {
        totalSecrets: secretCount,
        totalAuditLogs: auditLogCount,
        totalAPIKeys: apiKeyCount
      };
    } catch (err) {
      console.error('Failed to get security stats:', err);
      throw err;
    }
  }
}

export default SecurityManager;
