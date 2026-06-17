import { Redis } from "@upstash/redis";

// Підтримуємо як назви змінних Vercel KV, так і Upstash
export const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Кожна колекція зберігається як один ключ із JSON-масивом
export async function getCollection(name) {
  const data = await redis.get(name);
  return Array.isArray(data) ? data : [];
}

export async function setCollection(name, items) {
  await redis.set(name, items);
}
