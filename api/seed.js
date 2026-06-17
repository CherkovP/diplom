import { createRequire } from "module";
import { redis, getCollection } from "../lib/redis.js";

const require = createRequire(import.meta.url);
const COLLECTIONS = ["products", "categories", "users", "orders", "messages"];

// Заповнює KV даними з db.json.
// За замовчуванням сідає лише порожні колекції.
// ?force=1 — перезаписати все (стирає поточні дані).
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const force = req.url.includes("force=1");
  const db = require("../db.json");
  const result = {};

  try {
    for (const name of COLLECTIONS) {
      const existing = await getCollection(name);
      if (!force && existing.length > 0) {
        result[name] = `skipped (${existing.length} items)`;
        continue;
      }
      const data = Array.isArray(db[name]) ? db[name] : [];
      await redis.set(name, data);
      result[name] = `seeded ${data.length} items`;
    }
    res.status(200).json({ ok: true, force, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
