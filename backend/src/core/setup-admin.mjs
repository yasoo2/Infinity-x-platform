import { getDB } from './database.mjs';
import bcrypt from 'bcryptjs';

const SUPER_ADMIN_EMAIL = 'info.auraaluxury@gmail.com';
const SUPER_ADMIN_PASSWORD = 'younes2025';
const SUPER_ADMIN_ROLE = 'super_admin';

/**
 * Checks for and creates the default Super Admin user if one does not exist.
 * @param {Function} db - The function to get the MongoDB database instance.
 */
export async function setupSuperAdmin(db) {
    if (!db) {
        console.warn('⚠️ Cannot setup Super Admin: Database connection is not available.');
        return;
    }

    try {
        const mongoDb = await db();
        const usersCollection = mongoDb.collection('users');

        // 1. Check if the Super Admin user already exists
        const existingUser = await usersCollection.findOne({ email: SUPER_ADMIN_EMAIL });

        if (existingUser) {
            console.log(`✅ Super Admin user (${SUPER_ADMIN_EMAIL}) already exists. Skipping creation.`);
            return;
        }

        // 2. Hash the password
        const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

        // 3. Create the new Super Admin user
        const newUser = {
            email: SUPER_ADMIN_EMAIL,
            password: hashedPassword,
            role: SUPER_ADMIN_ROLE,
            createdAt: new Date(),
            updatedAt: new Date(),
            isVerified: true,
            // Add any other necessary fields
        };

        await usersCollection.insertOne(newUser);
        console.log(`🎉 Successfully created default Super Admin user: ${SUPER_ADMIN_EMAIL}`);

    } catch (error) {
        console.error('❌ Error setting up Super Admin user:', error);
    }
}
