import { MongoClient } from 'mongodb';

/**
 * MongoDB Tools for JOE
 * Provides full MongoDB operations: query, insert, update, delete, analyze
 */

class MongoDBTools {
  constructor(uri) {
    this.uri = uri || process.env.MONGODB_URI || process.env.MONGO_URI;
    this.client = null;
    this.db = null;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      if (this.client) {
        return { success: true, message: 'Already connected' };
      }

      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db();

      console.log('✅ Connected to MongoDB');
      return {
        success: true,
        message: 'Connected to MongoDB'
      };
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        console.log('✅ Disconnected from MongoDB');
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Disconnect failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ensure connection
   */
  async ensureConnection() {
    if (!this.client || !this.db) {
      return await this.connect();
    }
    return { success: true };
  }

  /**
   * List collections
   */
  async listCollections() {
    try {
      await this.ensureConnection();
      
      const collections = await this.db.listCollections().toArray();
      const names = collections.map(c => c.name);

      console.log(`✅ Found ${names.length} collections`);
      return {
        success: true,
        collections: names,
        count: names.length
      };
    } catch (error) {
      console.error('❌ List collections failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Query documents
   */
  async query(collectionName, filter = {}, options = {}) {
    try {
      await this.ensureConnection();
      
      const collection = this.db.collection(collectionName);
      const limit = options.limit || 100;
      const sort = options.sort || {};
      
      const documents = await collection
        .find(filter)
        .sort(sort)
        .limit(limit)
        .toArray();

      console.log(`✅ Found ${documents.length} documents`);
      return {
        success: true,
        documents,
        count: documents.length
      };
    } catch (error) {
      console.error('❌ Query failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Count documents
   */
  async count(collectionName, filter = {}) {
    try {
      await this.ensureConnection();
      
      const collection = this.db.collection(collectionName);
      const count = await collection.countDocuments(filter);

      console.log(`✅ Count: ${count}`);
      return {
        success: true,
        count
      };
    } catch (error) {
      console.error('❌ Count failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Insert document
   */
  async insert(collectionName, document) {
    try {
      await this.ensureConnection();
      
      const collection = this.db.collection(collectionName);
      const result = await collection.insertOne(document);

      console.log('✅ Document inserted');
      return {
        success: true,
        insertedId: result.insertedId
      };
    } catch (error) {
      console.error('❌ Insert failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Insert many documents
   */
  async insertMany(collectionName, documents) {
    try {
      await this.ensureConnection();
      
      const collection = this.db.collection(collectionName);
      const result = await collection.insertMany(documents);

      console.log(`✅ Inserted ${result.insertedCount} documents`);
      return {
        success: true,
        insertedCount: result.insertedCount,
        insertedIds: result.insertedIds
      };
    } catch (error) {
      console.error('❌ Insert many failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update document
   */
  async update(collectionName, filter, update, options = {}) {
    try {
      await this.ensureConnection();
      
      const collection = this.db.collection(collectionName);
      const updateMany = options.many || false;
      
      const result = updateMany
        ? await collection.updateMany(filter, { $set: update })
        : await collection.updateOne(filter, { $set: update });

      console.log(`✅ Updated ${result.modifiedCount} documents`);
      return {
        success: true,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error('❌ Update failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete document
   */
  async delete(collectionName, filter, options = {}) {
    try {
      await this.ensureConnection();
      
      const collection = this.db.collection(collectionName);
      const deleteMany = options.many || false;
      
      const result = deleteMany
        ? await collection.deleteMany(filter)
        : await collection.deleteOne(filter);

      console.log(`✅ Deleted ${result.deletedCount} documents`);
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      console.error('❌ Delete failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Aggregate
   */
  async aggregate(collectionName, pipeline) {
    try {
      await this.ensureConnection();
      
      const collection = this.db.collection(collectionName);
      const results = await collection.aggregate(pipeline).toArray();

      console.log(`✅ Aggregation returned ${results.length} results`);
      return {
        success: true,
        results,
        count: results.length
      };
    } catch (error) {
      console.error('❌ Aggregation failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get collection stats
   */
  async getStats(collectionName) {
    try {
      await this.ensureConnection();
      
      const collection = this.db.collection(collectionName);
      const stats = await this.db.command({ collStats: collectionName });

      console.log(`✅ Got stats for ${collectionName}`);
      return {
        success: true,
        stats: {
          count: stats.count,
          size: stats.size,
          avgObjSize: stats.avgObjSize,
          storageSize: stats.storageSize,
          indexes: stats.nindexes
        }
      };
    } catch (error) {
      console.error('❌ Get stats failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze database
   */
  async analyzeDatabase() {
    try {
      await this.ensureConnection();
      
      // Get all collections
      const collectionsResult = await this.listCollections();
      if (!collectionsResult.success) {
        return collectionsResult;
      }

      // Get stats for each collection
      const analysis = [];
      for (const collectionName of collectionsResult.collections) {
        const statsResult = await this.getStats(collectionName);
        if (statsResult.success) {
          analysis.push({
            collection: collectionName,
            ...statsResult.stats
          });
        }
      }

      // Calculate totals
      const totals = {
        collections: analysis.length,
        totalDocuments: analysis.reduce((sum, c) => sum + c.count, 0),
        totalSize: analysis.reduce((sum, c) => sum + c.size, 0),
        totalIndexes: analysis.reduce((sum, c) => sum + c.indexes, 0)
      };

      console.log('✅ Database analysis complete');
      return {
        success: true,
        analysis,
        totals
      };
    } catch (error) {
      console.error('❌ Analyze database failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search across collections
   */
  async searchAll(searchTerm, collections = null) {
    try {
      await this.ensureConnection();
      
      // Get collections to search
      let collectionsToSearch = collections;
      if (!collectionsToSearch) {
        const listResult = await this.listCollections();
        if (!listResult.success) {
          return listResult;
        }
        collectionsToSearch = listResult.collections;
      }

      // Search in each collection
      const results = [];
      for (const collectionName of collectionsToSearch) {
        try {
          const collection = this.db.collection(collectionName);
          
          // Try text search first
          let docs = await collection
            .find({ $text: { $search: searchTerm } })
            .limit(10)
            .toArray();

          // If no text index, try regex search on common fields
          if (docs.length === 0) {
            const regex = new RegExp(searchTerm, 'i');
            docs = await collection
              .find({
                $or: [
                  { name: regex },
                  { title: regex },
                  { description: regex },
                  { content: regex }
                ]
              })
              .limit(10)
              .toArray();
          }

          if (docs.length > 0) {
            results.push({
              collection: collectionName,
              documents: docs,
              count: docs.length
            });
          }
        } catch (error) {
          // Skip collections with errors
          console.log(`⚠️ Skipped ${collectionName}: ${error.message}`);
        }
      }

      console.log(`✅ Search found results in ${results.length} collections`);
      return {
        success: true,
        results,
        totalMatches: results.reduce((sum, r) => sum + r.count, 0)
      };
    } catch (error) {
      console.error('❌ Search all failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton
export const mongodbTools = new MongoDBTools(process.env.MONGODB_URI || process.env.MONGO_URI);
export default MongoDBTools;
