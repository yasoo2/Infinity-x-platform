import Redis from "ioredis";

let redisClient = null;
let memoryCache = {};

export function initRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("[Redis] disabled (no external REDIS_URL)");
    redisClient = null;
    return;
  }
  console.log("[Redis] init requested:", url);
  redisClient = new Redis(url);
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  if (redisClient) {
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } else {
    memoryCache[key] = { value, expireAt: Date.now() + ttlSeconds * 1000 };
  }
}

export async function cacheGet(key) {
  if (redisClient) {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } else {
    const item = memoryCache[key];
    if (!item) return null;
    if (Date.now() > item.expireAt) {
      delete memoryCache[key];
      return null;
    }
    return item.value;
  }
}
