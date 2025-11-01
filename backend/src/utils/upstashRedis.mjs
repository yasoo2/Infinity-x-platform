import { Redis } from '@upstash/redis';

/**
 * Upstash Redis Client using REST API
 * No connection issues, works perfectly with serverless
 */

let redis = null;

export function getUpstashRedis() {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log('✅ Upstash Redis initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Upstash Redis:', error.message);
      return null;
    }
  }
  return redis;
}

export function isRedisAvailable() {
  return redis !== null;
}

// Test connection
export async function testRedisConnection() {
  try {
    const client = getUpstashRedis();
    if (!client) {
      return { ok: false, error: 'Redis not configured' };
    }

    await client.set('test-connection', 'ok', { ex: 10 });
    const value = await client.get('test-connection');
    
    if (value === 'ok') {
      console.log('✅ Upstash Redis connection test passed');
      return { ok: true };
    } else {
      return { ok: false, error: 'Test value mismatch' };
    }
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message);
    return { ok: false, error: error.message };
  }
}
