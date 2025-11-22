// Pre-load and configure environment variables (CommonJS version)
const dotenv = require('dotenv');
const path = require('path');

// In a .cjs file, __dirname is the directory of the file (`backend/src`).
// We need to navigate up one level to the `backend` directory to find the .env file.
const envPath = path.resolve(__dirname, '..', '.env');

dotenv.config({ path: envPath });

console.log(`[Config Loader] Loaded .env from ${envPath}`);
console.log(`[Config Loader] OPENAI_API_KEY is ${process.env.OPENAI_API_KEY ? 'loaded' : 'MISSING'}.`);
