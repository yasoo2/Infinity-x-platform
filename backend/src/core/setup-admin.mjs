import User from '../database/models/User.mjs';
import bcrypt from 'bcryptjs';

const SUPER_ADMIN_EMAIL = 'info.auraaluxury@gmail.com';
const SUPER_ADMIN_PASSWORD = 'younes2025';
const SUPER_ADMIN_ROLE = 'super_admin';

/**
 * Checks for and creates the default Super Admin user if one does not exist.
 * Checks for and creates the default Super Admin user if one does not exist.
 */
export async function setupSuperAdmin() {
    try {
        // 1. Check if the Super Admin user already exists
        const existingUser = await User.findOne({ email: SUPER_ADMIN_EMAIL });
        const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
        const now = new Date();

        if (existingUser) {
            // Update existing admin's password and role
            await User.updateOne(
                { _id: existingUser._id },
                { $set: { password: hashedPassword, role: SUPER_ADMIN_ROLE, updatedAt: now } }
            );
            console.log(`✅ Super Admin user (${SUPER_ADMIN_EMAIL}) updated with new password and role.`);
            return;
        }

        // 3. Create the new Super Admin user
        const newUser = new User({
            email: SUPER_ADMIN_EMAIL,
            password: hashedPassword,
            role: SUPER_ADMIN_ROLE,
            isVerified: true,
            // Add any other necessary fields
        });

        await newUser.save();
        console.log(`🎉 Successfully created default Super Admin user: ${SUPER_ADMIN_EMAIL}`);

    } catch (error) {
        console.error('❌ Error setting up Super Admin user:', error);
    }
}
