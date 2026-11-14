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
const webpush = require('./webpush');

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
const PUSH_DIR = path.join(DATA_DIR, 'push');
fs.mkdirSync(PUSH_DIR, { recursive: true });
const PUSH_SUBJECT = process.env.PUSH_SUBJECT || 'mailto:cheriotchi@example.invalid';

// clés VAPID créées une fois puis gardées dans le volume
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');
let VAPID;
try { VAPID = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8')); } catch (e) {
  VAPID = webpush.generateVapidKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(VAPID));
}

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

// ---- Notifications ----
const pushFile = (code) => path.join(PUSH_DIR, code + '.json');
function readSubs(code) { try { return JSON.parse(fs.readFileSync(pushFile(code), 'utf8')); } catch (e) { return []; } }
function writeSubs(code, subs) {
  if (!subs.length) { try { fs.unlinkSync(pushFile(code)); } catch (e) { /* déjà vide */ } return; }
  const tmp = pushFile(code) + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(subs));
  fs.renameSync(tmp, pushFile(code));
}

function validTz(tz) {
  try { new Intl.DateTimeFormat('fr-FR', { timeZone: tz }); return true; } catch (e) { return false; }
}
function localParts(ts, tz) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false });
  const p = Object.fromEntries(f.formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
}

// même calcul que le jeu : ce que deviennent ses jauges pendant l'absence
function project(save, tz, now) {
  const p = { hunger: save.hunger, energy: save.energy, happy: save.happy, love: save.love };
  let t = save.lastSeen;
  let left = Math.min((now - t) / 3600000, 72);
  const c = (v) => Math.max(0, Math.min(100, v));
  while (left > 0) {
    const dt = Math.min(1, left);
    const h = localParts(t, tz).hour;
    if (h >= 22 || h < 7) { p.energy += 8 * dt; p.hunger -= 2.5 * dt; p.happy -= 1 * dt; p.love -= 1.5 * dt; }
    else { p.hunger -= 5 * dt; p.energy -= 3 * dt; p.happy -= 4 * dt; p.love -= 3 * dt; }
    for (const k of Object.keys(p)) p[k] = c(p[k]);
    t += dt * 3600000; left -= dt;
  }
  return p;
}

function pickNotification(save, entry, now) {
  const tz = entry.tz || 'Europe/Paris';
  const last = entry.last || {};
  const { day, hour } = localParts(now, tz);
  if (now - save.lastSeen < 45 * 60 * 1000) return null;        // il joue en ce moment
  if (hour >= 22 || hour < 8) return null;                       // on ne réveille personne
  const p = project(save, tz, now);
  const since = (k) => now - (last[k] || 0);
  const name = (save.name || '').replace(/^Mon\s+/i, '') || 'ton Chéri-o-tchi';
  if (p.hunger <= 5 && since('sick') > 8 * 3600e3) return { key: 'sick', title: '🤒 Il ne se sent pas bien…', body: `${name} a besoin de toi, viens le soigner 💊` };
  if (p.hunger < 25 && since('hunger') > 8 * 3600e3) return { key: 'hunger', title: "🍔 J'ai faim !", body: `${name} réclame à manger… viens vite 😋` };
  if (p.love < 30 && since('love') > 12 * 3600e3) return { key: 'love', title: '💌 Tu me manques…', body: `${name} attend un câlin 🥺` };
  if (hour >= 9 && hour < 12 && save.lastVisitDay !== day && last.daily !== day) return { key: 'daily', dayMark: day, title: '☀️ Coucou !', body: 'Ton mot du jour et tes défis t’attendent 💌' };
  return null;
}

let pushRunning = false;
async function checkPushes() {
  if (pushRunning) return;
  pushRunning = true;
  try {
    const now = Date.now();
    for (const f of fs.readdirSync(PUSH_DIR)) {
      if (!f.endsWith('.json')) continue;
      const code = f.slice(0, -5);
      const rec = readSave(code);
      let subs = readSubs(code);
      if (!rec) { writeSubs(code, []); continue; }
      let changed = false;
      for (const entry of subs) {
        const n = pickNotification(rec.save, entry, now);
        if (!n) continue;
        try {
          const status = await webpush.sendNotification(entry.sub, { title: n.title, body: n.body, tag: n.key, url: './' }, VAPID, PUSH_SUBJECT);
          if (status === 404 || status === 410) { entry.dead = true; }
          entry.last = { ...(entry.last || {}), [n.key]: n.dayMark || now };
          changed = true;
        } catch (e) { /* réessai au prochain passage */ }
      }
      if (changed) { subs = subs.filter((x) => !x.dead); writeSubs(code, subs); }
    }
  } finally { pushRunning = false; }
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

  if (url.pathname === '/api/push/key' && req.method === 'GET') return send(res, 200, { publicKey: VAPID.publicKey });

  if (url.pathname.startsWith('/api/push/') && req.method === 'POST') {
    const body = await readBody(req);
    const code = String(body.code || '').toUpperCase();
    if (!CODE_RE.test(code) || !readSave(code)) return send(res, 404, { error: 'Code inconnu' });
    let subs = readSubs(code);
    if (url.pathname === '/api/push/subscribe') {
      const sub = body.subscription;
      const okSub = sub && typeof sub.endpoint === 'string' && /^https:\/\//.test(sub.endpoint) && sub.keys && sub.keys.p256dh && sub.keys.auth;
      if (!okSub) return send(res, 400, { error: 'Abonnement invalide' });
      const tz = validTz(body.tz) ? body.tz : 'Europe/Paris';
      subs = subs.filter((x) => x.sub.endpoint !== sub.endpoint);
      subs.push({ sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, tz, last: {} });
      writeSubs(code, subs.slice(-5));
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/push/unsubscribe') {
      writeSubs(code, subs.filter((x) => x.sub.endpoint !== body.endpoint));
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/api/push/test') {
      const target = subs.filter((x) => !body.endpoint || x.sub.endpoint === body.endpoint);
      let sent = 0;
      for (const entry of target) {
        try {
          const st = await webpush.sendNotification(entry.sub, { title: '🔔 Ça marche !', body: 'Tu recevras un petit mot quand il aura besoin de toi 💕', tag: 'test', url: './' }, VAPID, PUSH_SUBJECT);
          if (st >= 200 && st < 300) sent++;
        } catch (e) { /* ignoré */ }
      }
      return send(res, 200, { sent });
    }
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

module.exports = { createServer, checkPushes, pickNotification, project };

if (require.main === module) {
  setTimeout(checkPushes, 30 * 1000);
  setInterval(checkPushes, 10 * 60 * 1000);
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => console.log(`Chéri-o-tchi sur http://localhost:${port} (sauvegardes : ${DATA_DIR})`));
}
