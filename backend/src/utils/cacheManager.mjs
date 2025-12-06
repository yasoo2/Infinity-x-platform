import { getUpstashRedis, shouldUseRedis } from './upstashRedis.mjs';

const memoryStore = new Map();
const now = () => Date.now();

function memGet(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.exp && entry.exp < now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.val;
}

function memSet(key, value, ttlSec) {
  const exp = ttlSec ? now() + ttlSec * 1000 : 0;
  memoryStore.set(key, { val: value, exp });
  return true;
}

function memDel(key) {
  memoryStore.delete(key);
  return true;
}

/**
 * Simple Cache Manager using Upstash Redis
 */

class CacheManager {
  constructor() {
    const wantsRedis = shouldUseRedis();
    this.redis = wantsRedis ? getUpstashRedis() : null;
    this.enabled = !!this.redis;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (this.enabled) {
      try {
        const value = await this.redis.get(key);
        if (value) {
          console.log(`✅ Cache HIT (Redis): ${key}`);
          return JSON.parse(value);
        }
        console.log(`⚠️ Cache MISS (Redis): ${key}`);
      } catch (error) {
        console.error(`❌ Cache GET error (Redis) for ${key}:`, error.message);
      }
    }
    const mval = memGet(key);
    if (mval !== null) {
      console.log(`✅ Cache HIT (Memory): ${key}`);
      return mval;
    }
    console.log(`⚠️ Cache MISS (Memory): ${key}`);
    return null;
  }

  /**
   * Set value in cache with TTL (seconds)
   */
    async set(key, value, ttl = 3600) {
    let ok = false;
    if (this.enabled) {
      // Simple rate limit check: if key was set recently, skip to prevent abuse
      const lastSetKey = `last_set:${key}`;
      try {
        const lastSetTime = await this.redis.get(lastSetKey);
        if (lastSetTime) {
          console.warn(`⚠️ Cache SET rate limit: Skipping set for ${key}`);
        } else {
          await this.redis.set(key, JSON.stringify(value), { ex: ttl });
          await this.redis.set(lastSetKey, Date.now(), { ex: 5 });
          console.log(`✅ Cache SET (Redis): ${key} (TTL: ${ttl}s)`);
          ok = true;
        }
      } catch (error) {
        console.error(`❌ Cache SET error (Redis) for ${key}:`, error.message);
      }
    }
    // Always set memory cache as fallback
    memSet(key, value, ttl);
    if (!ok) console.log(`✅ Cache SET (Memory): ${key} (TTL: ${ttl}s)`);
    return true;
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    let ok = true;
    if (this.enabled) {
      try {
        await this.redis.del(key);
        console.log(`✅ Cache DEL (Redis): ${key}`);
      } catch (error) {
        console.error(`❌ Cache DEL error (Redis) for ${key}:`, error.message);
        ok = false;
      }
    }
    memDel(key);
    return ok;
  }

  /**
   * Check if cache is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet(key, fetchFn, ttl = 3600) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    try {
      const fresh = await fetchFn();
      await this.set(key, fresh, ttl);
      return fresh;
    } catch (error) {
      console.error(`❌ getOrSet failed for ${key}:`, error.message);
      throw error;
    }
  }
}

// Export singleton
export const cacheManager = new CacheManager();
