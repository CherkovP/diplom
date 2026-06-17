import { getCollection, setCollection } from "../lib/redis.js";

const COLLECTIONS = ["products", "categories", "users", "orders", "messages"];

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function filterAndSort(items, query) {
  let result = [...items];

  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("_")) continue;
    result = result.filter((item) => String(item[key]) === String(value));
  }

  const sort = query["_sort"];
  const order = query["_order"];
  if (sort) {
    result.sort((a, b) => {
      if (a[sort] < b[sort]) return order === "desc" ? 1 : -1;
      if (a[sort] > b[sort]) return order === "desc" ? -1 : 1;
      return 0;
    });
  }

  return result;
}

function findById(items, id) {
  const numId = parseInt(id);
  return items.find((x) => x.id === numId || x.id === id);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const rawPath = req.url.replace(/^\/api/, "").split("?")[0];
  const queryString = req.url.includes("?") ? req.url.split("?")[1] : "";
  const query = Object.fromEntries(new URLSearchParams(queryString));
  const parts = rawPath.split("/").filter(Boolean);
  const collection = parts[0];
  const id = parts[1];

  if (!collection || !COLLECTIONS.includes(collection)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    const items = await getCollection(collection);

    // GET
    if (req.method === "GET") {
      if (id !== undefined) {
        const item = findById(items, id);
        if (!item) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        res.status(200).json(item);
      } else {
        res.status(200).json(filterAndSort(items, query));
      }
      return;
    }

    // POST
    if (req.method === "POST") {
      const body = await readBody(req);
      const maxId = items.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);
      const created = { id: maxId + 1, ...body };
      items.push(created);
      await setCollection(collection, items);
      res.status(201).json(created);
      return;
    }

    // PUT / PATCH
    if (req.method === "PUT" || req.method === "PATCH") {
      const body = await readBody(req);
      const numId = parseInt(id);
      const idx = items.findIndex((x) => x.id === numId || x.id === id);
      if (idx < 0) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const updated =
        req.method === "PUT"
          ? { ...body, id: items[idx].id }
          : { ...items[idx], ...body, id: items[idx].id };
      items[idx] = updated;
      await setCollection(collection, items);
      res.status(200).json(updated);
      return;
    }

    // DELETE
    if (req.method === "DELETE") {
      const numId = parseInt(id);
      const next = items.filter((x) => !(x.id === numId || x.id === id));
      await setCollection(collection, next);
      res.status(200).json({});
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
