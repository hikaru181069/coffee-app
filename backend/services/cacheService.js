const Redis = require("ioredis");

const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  lazyConnect: true,
  enableOfflineQueue: false,
});

client.on("error", (err) => {
  console.warn("Redis connection error:", err.message);
});

const get = async (key) => {
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const set = async (key, value, ttlSeconds = 3600) => {
  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Redis unavailable - skip silently
  }
};

const del = async (key) => {
  try {
    await client.del(key);
  } catch {
    // Redis unavailable - skip silently
  }
};

module.exports = { get, set, del };
