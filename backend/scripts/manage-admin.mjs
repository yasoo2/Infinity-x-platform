
/**
 * Unified Admin Management Script
 * @version 1.6
 *
 * This script provides a centralized, command-line tool to manage super admins.
 * It connects directly to the database to create or update admin credentials.
 *
 * Usage:
 * node backend/scripts/manage-admin.mjs <email> <password>
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

dotenv.config();

async function run() {
    const [,, email, password] = process.argv;
    const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
    const DB_NAME = process.env.DB_NAME || 'future_system';

    // --- Validation ---
    if (!MONGO_URI) {
        console.error('❌ ERROR: MONGO_URI environment variable is not set.');
        process.exit(1);
    }
    if (!email || !password) {
        console.error('❌ ERROR: Email and password must be provided as command-line arguments.');
        console.error('Usage: node backend/scripts/manage-admin.mjs <email> <password>');
        process.exit(1);
    }
    if (password.length < 8) {
        console.error('❌ ERROR: Password must be at least 8 characters long.');
        process.exit(1);
    }

    const client = new MongoClient(MONGO_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const usersCollection = db.collection('users');
        console.log('✅ Connected to MongoDB.');

        // --- Logic ---
        const existingAdmin = await usersCollection.findOne({ email });
        const hashedPassword = await bcrypt.hash(password, 12); // Use a higher salt round

        if (existingAdmin) {
            // 1. Update existing admin
            console.log(`📝 Found existing admin with email: ${email}. Updating password...`);
            const result = await usersCollection.updateOne(
                { _id: existingAdmin._id },
                { 
                    $set: { 
                        password: hashedPassword, // Ensure field name matches schema
                        updatedAt: new Date()
                    }
                }
            );
            if (result.modifiedCount === 1) {
                console.log('✅ Super admin password updated successfully!');
            } else {
                console.warn('⚠️ Admin found, but password was not updated (it might be the same).');
            }
        } else {
            // 2. Create new admin
            console.log(`✨ Creating new super admin with email: ${email}...`);
            const now = new Date();
            const newUser = {
                email,
                password: hashedPassword, // Ensure field name matches schema
                role: 'super_admin',
                createdAt: now,
                updatedAt: now,
            };
            const result = await usersCollection.insertOne(newUser);
            console.log(`✅ Super admin created successfully with ID: ${result.insertedId}`);
        }

    } catch (error) {
        console.error('❌ A fatal error occurred:', error);
        process.exit(1);
    } finally {
        await client.close();
        console.log('🔌 MongoDB connection closed.');
    }
}

run();
