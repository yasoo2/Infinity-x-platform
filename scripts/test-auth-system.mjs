#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Configuration
const SUPABASE_URL = 'https://nzwkeusxrrdncjjdqasj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56d2tldXN4cnJkbmNqamRxYXNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTE4MzQzMSwiZXhwIjoyMDc0NzU5NDMxfQ.-9VfzrwGHHq1MwqdqqF9XvD9VSkt6qsweafw8L3E8jA';
const JWT_SECRET = 'test-secret-key';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  fullName: 'Test User'
};

// Test functions
async function testDatabaseSchema() {
  console.log('🧪 Testing Database Schema...');
  
  try {
    // Test user_profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ user_profiles table error:', profilesError.message);
      return false;
    }
    console.log('✅ user_profiles table accessible');
    
    // Test user_sessions table
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .limit(1);
    
    if (sessionsError) {
      console.log('❌ user_sessions table error:', sessionsError.message);
      return false;
    }
    console.log('✅ user_sessions table accessible');
    
    // Test login_attempts table
    const { data: attempts, error: attemptsError } = await supabase
      .from('login_attempts')
      .select('*')
      .limit(1);
    
    if (attemptsError) {
      console.log('❌ login_attempts table error:', attemptsError.message);
      return false;
    }
    console.log('✅ login_attempts table accessible');
    
    // Test password_reset_tokens table
    const { data: resetTokens, error: resetError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .limit(1);
    
    if (resetError) {
      console.log('❌ password_reset_tokens table error:', resetError.message);
      return false;
    }
    console.log('✅ password_reset_tokens table accessible');
    
    // Test audit_logs table
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1);
    
    if (auditError) {
      console.log('❌ audit_logs table error:', auditError.message);
      return false;
    }
    console.log('✅ audit_logs table accessible');
    
    return true;
  } catch (error) {
    console.log('❌ Database schema test failed:', error.message);
    return false;
  }
}

async function testUserRegistration() {
  console.log('🧪 Testing User Registration...');
  
  try {
    // Clean up existing test user
    await supabase.auth.admin.deleteUser(testUser.email).catch(() => {});
    
    // Create user
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          full_name: testUser.fullName
        }
      }
    });
    
    if (authError) {
      console.log('❌ User registration failed:', authError.message);
      return false;
    }
    
    if (!authUser.user) {
      console.log('❌ No user created');
      return false;
    }
    
    console.log('✅ User registered successfully');
    console.log('   User ID:', authUser.user.id);
    console.log('   Email:', authUser.user.email);
    
    // Check if user profile was created automatically
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.user.id)
      .single();
    
    if (!profile) {
      console.log('❌ User profile not created automatically');
      return false;
    }
    
    console.log('✅ User profile created automatically');
    console.log('   Role:', profile.role);
    console.log('   Full Name:', profile.full_name);
    
    return authUser.user;
  } catch (error) {
    console.log('❌ User registration test failed:', error.message);
    return false;
  }
}

async function testUserLogin() {
  console.log('🧪 Testing User Login...');
  
  try {
    // Attempt login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });
    
    if (authError) {
      console.log('❌ User login failed:', authError.message);
      return false;
    }
    
    if (!authData.user) {
      console.log('❌ No user returned from login');
      return false;
    }
    
    console.log('✅ User login successful');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    
    // Check if login attempt was logged
    const { data: loginAttempts } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('email', testUser.email)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (loginAttempts && loginAttempts.length > 0) {
      console.log('✅ Login attempt logged');
      console.log('   Success:', loginAttempts[0].success);
      console.log('   IP Address:', loginAttempts[0].ip_address);
    }
    
    return authData;
  } catch (error) {
    console.log('❌ User login test failed:', error.message);
    return false;
  }
}

async function testJWTTokenGeneration() {
  console.log('🧪 Testing JWT Token Generation...');
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return false;
    }
    
    // Generate JWT token
    const payload = {
      userId: user.id,
      email: user.email,
      role: 'USER'
    };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    console.log('✅ JWT tokens generated successfully');
    console.log('   Access Token Length:', accessToken.length);
    console.log('   Refresh Token Length:', refreshToken.length);
    
    // Verify tokens
    const decodedAccess = jwt.verify(accessToken, JWT_SECRET);
    const decodedRefresh = jwt.verify(refreshToken, JWT_SECRET);
    
    console.log('✅ JWT tokens verified successfully');
    console.log('   Access Token User ID:', decodedAccess.userId);
    console.log('   Refresh Token User ID:', decodedRefresh.userId);
    
    return { accessToken, refreshToken };
  } catch (error) {
    console.log('❌ JWT token generation test failed:', error.message);
    return false;
  }
}

async function testSessionManagement() {
  console.log('🧪 Testing Session Management...');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return false;
    }
    
    // Create session token
    const { data: sessionToken } = await supabase.rpc('create_user_session', {
      p_user_id: user.id,
      p_days_valid: 30
    });
    
    if (!sessionToken) {
      console.log('❌ Session token creation failed');
      return false;
    }
    
    console.log('✅ Session token created');
    console.log('   Session Token:', sessionToken.substring(0, 20) + '...');
    
    // Validate session token
    const { data: validationData } = await supabase.rpc('validate_user_session', {
      p_session_token: sessionToken
    });
    
    if (!validationData || !validationData.is_valid) {
      console.log('❌ Session token validation failed');
      return false;
    }
    
    console.log('✅ Session token validated');
    console.log('   User ID:', validationData.user_id);
    console.log('   Is Valid:', validationData.is_valid);
    
    return sessionToken;
  } catch (error) {
    console.log('❌ Session management test failed:', error.message);
    return false;
  }
}

async function testPasswordReset() {
  console.log('🧪 Testing Password Reset...');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return false;
    }
    
    // Create password reset token
    const { data: resetToken } = await supabase.rpc('create_password_reset_token', {
      p_user_id: user.id,
      p_expires_hours: 1
    });
    
    if (!resetToken) {
      console.log('❌ Password reset token creation failed');
      return false;
    }
    
    console.log('✅ Password reset token created');
    console.log('   Reset Token:', resetToken.substring(0, 20) + '...');
    
    // Validate reset token
    const { data: validationData } = await supabase.rpc('validate_password_reset_token', {
      p_token: resetToken
    });
    
    if (!validationData || !validationData.is_valid) {
      console.log('❌ Password reset token validation failed');
      return false;
    }
    
    console.log('✅ Password reset token validated');
    console.log('   User ID:', validationData.user_id);
    console.log('   Is Valid:', validationData.is_valid);
    
    return resetToken;
  } catch (error) {
    console.log('❌ Password reset test failed:', error.message);
    return false;
  }
}

async function testRoleBasedAccess() {
  console.log('🧪 Testing Role-Based Access Control...');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return false;
    }
    
    // Get user profile with role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile) {
      console.log('❌ User profile not found');
      return false;
    }
    
    console.log('✅ User role retrieved');
    console.log('   Role:', profile.role);
    
    // Test RLS policies by trying to access other users' data
    const { data: otherUsers } = await supabase
      .from('user_profiles')
      .select('*')
      .neq('id', user.id)
      .limit(5);
    
    if (profile.role === 'USER') {
      // Regular users should not see other users' data
      if (otherUsers && otherUsers.length > 0) {
        console.log('❌ RLS policy violation: User can see other users data');
        return false;
      }
      console.log('✅ RLS policy enforced: User cannot see other users data');
    } else if (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') {
      // Admins should be able to see other users' data
      console.log('✅ Admin role allows viewing other users data');
      console.log('   Other users count:', otherUsers ? otherUsers.length : 0);
    }
    
    return profile.role;
  } catch (error) {
    console.log('❌ Role-based access test failed:', error.message);
    return false;
  }
}

async function testAuditLogging() {
  console.log('🧪 Testing Audit Logging...');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return false;
    }
    
    // Check audit logs for user
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!auditLogs || auditLogs.length === 0) {
      console.log('⚠️  No audit logs found for user');
    } else {
      console.log('✅ Audit logs found');
      console.log('   Recent actions:', auditLogs.map(log => log.action).join(', '));
    }
    
    return true;
  } catch (error) {
    console.log('❌ Audit logging test failed:', error.message);
    return false;
  }
}

async function testLogout() {
  console.log('🧪 Testing User Logout...');
  
  try {
    // Sign out
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.log('❌ User logout failed:', error.message);
      return false;
    }
    
    console.log('✅ User logout successful');
    
    // Verify user is logged out
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log('❌ User still authenticated after logout');
      return false;
    }
    
    console.log('✅ User successfully logged out');
    
    return true;
  } catch (error) {
    console.log('❌ User logout test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Authentication System Tests...\n');
  
  const tests = [
    { name: 'Database Schema', test: testDatabaseSchema },
    { name: 'User Registration', test: testUserRegistration },
    { name: 'User Login', test: testUserLogin },
    { name: 'JWT Token Generation', test: testJWTTokenGeneration },
    { name: 'Session Management', test: testSessionManagement },
    { name: 'Password Reset', test: testPasswordReset },
    { name: 'Role-Based Access', test: testRoleBasedAccess },
    { name: 'Audit Logging', test: testAuditLogging },
    { name: 'User Logout', test: testLogout }
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    console.log(`\n📋 Running: ${name}`);
    console.log('='.repeat(50));
    
    try {
      const result = await test();
      results.push({ name, success: !!result, result });
      
      if (result) {
        console.log(`✅ ${name} PASSED`);
      } else {
        console.log(`❌ ${name} FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${name} ERROR:`, error.message);
      results.push({ name, success: false, error: error.message });
    }
    
    console.log('');
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.name}`);
      if (r.error) {
        console.log(`     Error: ${r.error}`);
      }
    });
  }
  
  console.log('\n🏁 Authentication System Test Complete');
}

// Run tests
runTests().catch(console.error);