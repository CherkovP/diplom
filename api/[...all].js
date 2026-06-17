import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function getDb() {
  return JSON.parse(JSON.stringify(require('../db.json')));
}

function filterAndSort(items, query) {
  let result = [...items];

  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('_')) continue;
    result = result.filter(item => String(item[key]) === String(value));
  }

  const sort = query['_sort'];
  const order = query['_order'];
  if (sort) {
    result.sort((a, b) => {
      if (a[sort] < b[sort]) return order === 'desc' ? 1 : -1;
      if (a[sort] > b[sort]) return order === 'desc' ? -1 : 1;
      return 0;
    });
  }

  return result;
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const rawPath = req.url.replace(/^\/api/, '').split('?')[0];
  const queryString = req.url.includes('?') ? req.url.split('?')[1] : '';
  const query = Object.fromEntries(new URLSearchParams(queryString));
  const parts = rawPath.split('/').filter(Boolean);
  const collection = parts[0];
  const id = parts[1];

  const db = getDb();

  if (!collection || !db[collection]) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const data = db[collection];

  if (req.method === 'GET') {
    if (id !== undefined) {
      const numId = parseInt(id);
      const item = data.find(x => x.id === numId || x.id === id);
      if (!item) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json(item);
    } else {
      res.status(200).json(filterAndSort(data, query));
    }
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const item = JSON.parse(body);
        const maxId = data.reduce((m, x) => Math.max(m, x.id || 0), 0);
        const created = { id: maxId + 1, ...item };
        res.status(201).json(created);
      } catch {
        res.status(400).json({ error: 'Bad request' });
      }
    });
    return;
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const numId = parseInt(id);
        const item = data.find(x => x.id === numId || x.id === id);
        const updated = { ...(item || {}), ...updates, id: numId || id };
        res.status(200).json(updated);
      } catch {
        res.status(400).json({ error: 'Bad request' });
      }
    });
    return;
  }

  if (req.method === 'DELETE') {
    res.status(200).json({});
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
