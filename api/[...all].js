import jsonServer from 'json-server';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let app = null;

function buildApp() {
  const db = JSON.parse(JSON.stringify(require('../db.json')));
  const server = jsonServer.create();
  const router = jsonServer.router(db);
  server.use(jsonServer.defaults({ nolog: true }));
  server.use(router);
  return server;
}

export default function handler(req, res) {
  if (!app) app = buildApp();
  req.url = req.url.replace(/^\/api/, '') || '/';
  app(req, res);
}
