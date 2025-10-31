#!/usr/bin/env node

/**
 * سكريبت لإنشاء Super Admin
 * 
 * الاستخدام:
 * node scripts/create-super-admin.mjs
 */

import axios from 'axios';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createSuperAdmin() {
  console.log('='.repeat(60));
  console.log('InfinityX - Create Super Admin');
  console.log('='.repeat(60));
  console.log();

  try {
    // طلب المعلومات من المستخدم
    const apiUrl = await question('API URL (default: https://api.xelitesolutions.com): ') 
      || 'https://api.xelitesolutions.com';
    
    const email = await question('Super Admin Email: ');
    if (!email) {
      console.error('❌ Email is required');
      process.exit(1);
    }

    const password = await question('Super Admin Password (min 8 chars): ');
    if (!password || password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    const phone = await question('Phone (optional): ');

    console.log();
    console.log('Creating Super Admin...');

    // إرسال الطلب
    const response = await axios.post(
      `${apiUrl}/api/auth/bootstrap-super-admin`,
      {
        email,
        password,
        phone: phone || undefined
      }
    );

    console.log();
    console.log('✅ Success!');
    console.log('Mode:', response.data.mode);
    console.log('Super Admin ID:', response.data.superAdminId);
    console.log();
    console.log('You can now login with:');
    console.log('  Email:', email);
    console.log('  Password: ********');
    console.log();

  } catch (error) {
    console.error();
    console.error('❌ Error:', error.response?.data || error.message);
    console.error();
    process.exit(1);
  } finally {
    rl.close();
  }
}

createSuperAdmin();
