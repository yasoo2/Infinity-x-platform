import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// User Schema (simplified version)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'super_admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createSuperAdmin() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'info.auraaluxury@gmail.com';
    const password = 'younes2025';

    // Check if Super Admin already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log('📝 Super Admin already exists. Updating...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update the user
      existingUser.password = hashedPassword;
      existingUser.role = 'super_admin';
      existingUser.updatedAt = new Date();
      
      await existingUser.save();
      
      console.log('✅ Super Admin updated successfully!');
      console.log('📧 Email:', email);
      console.log('🔑 Password:', password);
      console.log('👑 Role:', existingUser.role);
      console.log('🆔 ID:', existingUser._id);
    } else {
      console.log('📝 Creating new Super Admin...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new Super Admin
      const superAdmin = new User({
        email,
        password: hashedPassword,
        role: 'super_admin'
      });
      
      await superAdmin.save();
      
      console.log('✅ Super Admin created successfully!');
      console.log('📧 Email:', email);
      console.log('🔑 Password:', password);
      console.log('👑 Role:', superAdmin.role);
      console.log('🆔 ID:', superAdmin._id);
    }

    console.log('\n🎉 Done! You can now log in with these credentials.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the script
createSuperAdmin();
