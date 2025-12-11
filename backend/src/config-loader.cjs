// Pre-load and configure environment variables (CommonJS version)
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');
const isProduction = process.env.NODE_ENV === 'production';
const isRender = Boolean(
  process.env.RENDER ||
  process.env.RENDER_SERVICE_ID ||
  process.env.RENDER_INSTANCE_ID ||
  process.env.RENDER_EXTERNAL_URL
);

if (isProduction || isRender) {
  console.log('[Config Loader] Skipping .env load (using runtime environment variables).');
} else {
  try {
    dotenv.config({ path: envPath });
    console.log(`[Config Loader] Loaded .env from ${envPath}`);
  } catch { /* noop */ }
}

console.log(`[Config Loader] OPENAI_API_KEY is ${process.env.OPENAI_API_KEY ? 'loaded' : 'MISSING'}.`);
