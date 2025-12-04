import User from '../database/models/User.mjs';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const SUPER_ADMIN_EMAIL = 'info.auraaluxury@gmail.com';
const SUPER_ADMIN_PASSWORD = 'younes2025';
const SUPER_ADMIN_ROLE = 'super_admin';

/**
 * Checks for and creates the default Super Admin user if one does not exist.
 */
export async function setupSuperAdmin() {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            // Check if MongoDB is connected
            if (mongoose.connection.readyState !== 1) {
                console.log(`⏳ Waiting for MongoDB connection... (Attempt ${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                retries++;
                continue;
            }

            // 1. Check if the Super Admin user already exists
            const existingUser = await User.findOne({ email: SUPER_ADMIN_EMAIL })
                .maxTimeMS(20000)
                .lean();

            if (existingUser) {
                console.log(`✅ Super Admin user (${SUPER_ADMIN_EMAIL}) already exists. Setup complete.`);
                return;
            }

            console.log(`Super Admin user (${SUPER_ADMIN_EMAIL}) not found, creating...`);
            const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

            // 2. Create the new Super Admin user
            const newUser = new User({
                email: SUPER_ADMIN_EMAIL,
                password: hashedPassword,
                role: SUPER_ADMIN_ROLE,
                isVerified: true,
            });

            await newUser.save();
            console.log(`🎉 Successfully created default Super Admin user: ${SUPER_ADMIN_EMAIL}`);
            return;

        } catch (error) {
            retries++;
            if (retries >= maxRetries) {
                console.error('❌ Error setting up Super Admin user after max retries:', error.message);
                console.log('⚠️ Super Admin setup will be skipped. You can create it manually later.');
                return;
            }
            console.log(`⚠️ Retry ${retries}/${maxRetries} for Super Admin setup...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}
