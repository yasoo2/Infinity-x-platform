
/**
 * Central Configuration System
 * Manages all environment variables for the application.
 * Ensures that all configurations are loaded from a single, reliable source (.env file).
 * @version 2.3
 */

import dotenv from 'dotenv';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const isRender = Boolean(
  process.env.RENDER ||
  process.env.RENDER_SERVICE_ID ||
  process.env.RENDER_INSTANCE_ID ||
  process.env.RENDER_EXTERNAL_URL
);

if (!(isProduction || isRender)) {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  } catch { /* noop */ }
}

const config = {
    // Server Configuration
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 8080,
    // System Version
    VERSION: '2.3',

    // Database Configuration
    // This is the critical part. The application will FAIL if this is not set.
    DATABASE_URI: process.env.DATABASE_URI,

    // JWT Authentication
    JWT_SECRET: process.env.JWT_SECRET || 'a-very-weak-secret-for-dev',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

    // OpenAI API Key (or other generative AI provider)
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // Add other configurations as the system grows
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// --- Configuration Validation ---
// A robust system validates its configuration on startup.

function validateConfig() {
    const requiredKeys = ['DATABASE_URI', 'OPENAI_API_KEY'];
    const missingKeys = requiredKeys.filter(key => !config[key]);

    if (missingKeys.length > 0) {
        console.error('❌ FATAL ERROR: Missing required environment variables!');
        if (isProduction || isRender) {
            console.error(`   Missing in runtime environment: ${missingKeys.join(', ')}`);
        } else {
            console.error(`   The following keys are missing in your .env file: ${missingKeys.join(', ')}`);
            console.error('   Please create a .env file in the root directory and add them.');
        }
    }
}

// Run validation when the module is loaded
validateConfig();

export default config;
