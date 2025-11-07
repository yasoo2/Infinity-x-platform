import { getUpstashRedis } from './upstashRedis.mjs';

/**
 * Simple Cache Manager using Upstash Redis
 */

class CacheManager {
  constructor() {
    this.redis = getUpstashRedis();
    this.enabled = this.redis !== null;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.enabled) return null;
    
    try {
      const value = await this.redis.get(key);
      if (value) {
        console.log(`✅ Cache HIT: ${key}`);
        return JSON.parse(value);
      }
      console.log(`⚠️ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error(`❌ Cache GET error for ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache with TTL (seconds)
   */
    async set(key, value, ttl = 3600) {
    if (!this.enabled) return false;

    // Simple rate limit check: if key was set recently, skip to prevent abuse
    const lastSetKey = `last_set:${key}`;
    const lastSetTime = await this.redis.get(lastSetKey);
    if (lastSetTime) {
      console.warn(`⚠️ Cache SET rate limit: Skipping set for ${key}`);
      return false;
    }
    
    try {
      await this.redis.set(key, JSON.stringify(value), { ex: ttl });
      // Set a temporary key to rate limit subsequent SET operations
      const lastSetKey = `last_set:${key}`;
      await this.redis.set(lastSetKey, Date.now(), { ex: 5 }); // 5 seconds rate limit for SET
      console.log(`✅ Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error(`❌ Cache SET error for ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    if (!this.enabled) return false;
    
    try {
      await this.redis.del(key);
      console.log(`✅ Cache DEL: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Cache DEL error for ${key}:`, error.message);
      return false;
    }
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
