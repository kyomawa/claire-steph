// Serveur du Chéri-o-tchi : sert le jeu (dossier html/) et la sauvegarde en ligne.
// Aucune dépendance : `node server/server.js`
//   PORT      port d'écoute (3000 par défaut)
//   DATA_DIR  dossier des sauvegardes (./data par défaut, /data dans Docker)
//
// API (le code de sauvegarde sert de clé secrète, format ABCD-EF23) :
//   GET  /api/health          -> { ok: true }
//   POST /api/saves           -> crée un code : body { save } -> { code, updatedAt }
//   GET  /api/saves/:code     -> { save, updatedAt }
//   PUT  /api/saves/:code     -> body { save } -> { updatedAt } (409 si le serveur a plus récent)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', 'html');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const MAX_BODY = 512 * 1024;
const CODE_RE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

fs.mkdirSync(DATA_DIR, { recursive: true });

// ---- petite limite de débit par IP ----
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const h = hits.get(ip) || { t: now, n: 0 };
  if (now - h.t > 60 * 1000) { h.t = now; h.n = 0; }
  h.n++;
  hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.n > 150;
}

function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(Object.assign(new Error('too big'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(Object.assign(new Error('bad json'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

const fileOf = (code) => path.join(DATA_DIR, code + '.json');

function readSave(code) {
  try { return JSON.parse(fs.readFileSync(fileOf(code), 'utf8')); } catch (e) { return null; }
}

function writeSave(code, save) {
  const record = { save, updatedAt: Date.now() };
  const tmp = fileOf(code) + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(record));
  fs.renameSync(tmp, fileOf(code));
  return record;
}

function validSave(save) {
  return save && typeof save === 'object' && typeof save.hunger === 'number' && typeof save.lastSeen === 'number';
}

function newCode() {
  for (;;) {
    const bytes = crypto.randomBytes(8);
    let c = '';
    for (let i = 0; i < 8; i++) c += ALPHABET[bytes[i] % ALPHABET.length] + (i === 3 ? '-' : '');
    if (!fs.existsSync(fileOf(c))) return c;
  }
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (rateLimited(ip)) return send(res, 429, { error: 'Trop de requêtes' });

  if (url.pathname === '/api/health') return send(res, 200, { ok: true });

  if (url.pathname === '/api/saves' && req.method === 'POST') {
    const body = await readBody(req);
    if (!validSave(body.save)) return send(res, 400, { error: 'Sauvegarde invalide' });
    const code = newCode();
    const rec = writeSave(code, body.save);
    return send(res, 201, { code, updatedAt: rec.updatedAt });
  }

  const m = url.pathname.match(/^\/api\/saves\/([A-Za-z0-9-]+)$/);
  if (m) {
    const code = m[1].toUpperCase();
    if (!CODE_RE.test(code)) return send(res, 400, { error: 'Code invalide' });
    if (req.method === 'GET') {
      const rec = readSave(code);
      return rec ? send(res, 200, rec) : send(res, 404, { error: 'Code inconnu' });
    }
    if (req.method === 'PUT') {
      const body = await readBody(req);
      if (!validSave(body.save)) return send(res, 400, { error: 'Sauvegarde invalide' });
      const cur = readSave(code);
      if (!cur) return send(res, 404, { error: 'Code inconnu' });
      // le plus récent gagne : on refuse d'écraser une partie jouée plus tard ailleurs
      const played = (sv) => sv.playedAt || sv.lastSeen || 0;
      if (!body.force && played(cur.save) > played(body.save) + 1000) return send(res, 409, cur);
      const rec = writeSave(code, body.save);
      return send(res, 200, { updatedAt: rec.updatedAt });
    }
  }
  return send(res, 404, { error: 'Introuvable' });
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) return send(res, 403, 'Interdit', { 'Content-Type': 'text/plain' });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Introuvable', { 'Content-Type': 'text/plain; charset=utf-8' });
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.png' ? 'public, max-age=86400' : 'no-cache'
    });
    res.end(data);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      handleApi(req, res, url).catch((e) => send(res, e.status || 500, { error: e.status ? e.message : 'Erreur serveur' }));
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res, url);
    } else {
      send(res, 405, { error: 'Méthode non autorisée' });
    }
  });
}

module.exports = { createServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => console.log(`Chéri-o-tchi sur http://localhost:${port} (sauvegardes : ${DATA_DIR})`));
}
