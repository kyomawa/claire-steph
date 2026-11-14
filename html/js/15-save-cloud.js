// =====================================================================
//  Sauvegarde en ligne (serveur server/server.js)
// =====================================================================
const SYNC_KEY = 'cheriotchi_sync';
const cloud = { available: false, code: null, timer: null, lastPush: 0, pushedPlayedAt: 0, error: '' };
const playedOf = (sv) => (sv && (sv.playedAt || sv.lastSeen)) || 0;
// « joué » = un vrai toucher / une touche, pas le temps qui passe
['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { state.playedAt = Date.now(); }, true));

function apiUrl(p) {
  if (CONFIG.apiBase) return CONFIG.apiBase.replace(/\/$/, '') + p;
  return location.protocol.startsWith('http') ? p : null;
}

async function api(method, p, body, keepalive) {
  const u = apiUrl(p);
  if (!u) throw new Error('offline');
  const r = await fetch(u, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    keepalive: !!keepalive,
    cache: 'no-store'
  });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

function applyRemote(remote, why) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
    sessionStorage.setItem('cheriotchi_pulled', String(Date.now()));
    sessionStorage.setItem('cheriotchi_pull_msg', why || 'Partie récupérée en ligne ☁️');
  } catch (e) { /* ignoré */ }
  saveRestoring = true;
  location.reload();
}

async function cloudPull(localPlayed) {
  if (!cloud.available || !cloud.code) return;
  try {
    const r = await api('GET', '/api/saves/' + cloud.code);
    if (r.status === 404) { cloud.error = 'Ce code n’existe plus sur le serveur'; updateCloudInfo(); return; }
    if (r.status !== 200) return;
    cloud.error = '';
    const remote = r.data.save;
    let recentPull = 0;
    try { recentPull = Number(sessionStorage.getItem('cheriotchi_pulled')) || 0; } catch (e) { /* ignoré */ }
    if (playedOf(remote) > (localPlayed || 0) + 1000 && Date.now() - recentPull > 15000) {
      applyRemote(remote, 'Partie plus récente récupérée ☁️');
      return;
    }
    cloudPush();
  } catch (e) { cloud.error = 'Serveur injoignable'; updateCloudInfo(); }
}

function scheduleCloudPush() {
  if (!cloud.available || !cloud.code) return;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(() => cloudPush(), 4000);
}

async function cloudPush(keepalive) {
  if (!cloud.available || !cloud.code || saveRestoring) return;
  if (playedOf(state) <= cloud.pushedPlayedAt) return; // rien de nouveau joué ici
  const sentPlayed = playedOf(state);
  try {
    const r = await api('PUT', '/api/saves/' + cloud.code, { save: state }, keepalive);
    if (r.status === 200) { cloud.lastPush = Date.now(); cloud.pushedPlayedAt = sentPlayed; cloud.error = ''; }
    else if (r.status === 409 && r.data && r.data.save) applyRemote(r.data.save, 'Partie plus récente trouvée sur un autre appareil ☁️');
    else if (r.status === 404) cloud.error = 'Ce code n’existe plus sur le serveur';
  } catch (e) { cloud.error = 'Serveur injoignable (sauvé sur le téléphone)'; }
  updateCloudInfo();
}

function updateCloudInfo() {
  const info = $('saveInfo');
  if (cloud.code && cloud.lastPush) {
    info.textContent = `☁️ Sauvegardé en ligne à ${new Date(cloud.lastPush).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (!saveModal.hidden) renderCloudBox();
}

function renderCloudBox() {
  const on = cloud.available && cloud.code;
  $('cloudOn').hidden = !on;
  $('cloudOff').hidden = !cloud.available || !!cloud.code;
  $('cloudCode').textContent = cloud.code || '';
  let txt;
  if (!cloud.available) txt = 'Pas disponible ici : il faut ouvrir le jeu depuis son adresse en ligne (hébergé avec le serveur).';
  else if (!cloud.code) txt = 'Désactivée. Active-la pour retrouver la partie sur n’importe quel téléphone.';
  else if (cloud.error) txt = '⚠️ ' + cloud.error;
  else txt = cloud.lastPush ? `✅ Activée · dernier envoi à ${new Date(cloud.lastPush).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '✅ Activée';
  $('cloudStatus').textContent = txt;
}

async function cloudInit(localPlayed) {
  try { cloud.code = localStorage.getItem(SYNC_KEY); } catch (e) { cloud.code = null; }
  try {
    const r = await api('GET', '/api/health');
    cloud.available = r.status === 200 && !!r.data.ok;
  } catch (e) { cloud.available = false; }
  try {
    const msg = sessionStorage.getItem('cheriotchi_pull_msg');
    if (msg) { sessionStorage.removeItem('cheriotchi_pull_msg'); toast(msg); }
  } catch (e) { /* ignoré */ }
  if (cloud.available && cloud.code) await cloudPull(localPlayed);
  fetchNotes();
  setInterval(() => { if (!document.hidden) fetchNotes(); }, 45 * 1000);
  updateCloudInfo();
  // appareil resté ouvert sans y toucher : on regarde de temps en temps si l'autre a joué
  setInterval(() => {
    if (!document.hidden && Date.now() - playedOf(state) > 60 * 1000) cloudPull(playedOf(state));
  }, 60 * 1000);
}

$('cloudEnable').addEventListener('click', async () => {
  try {
    saveState();
    const r = await api('POST', '/api/saves', { save: state });
    if (r.status !== 201) throw new Error();
    cloud.code = r.data.code;
    cloud.lastPush = Date.now();
    cloud.pushedPlayedAt = playedOf(state);
    localStorage.setItem(SYNC_KEY, cloud.code);
    setSaveMsg('Sauvegarde en ligne activée ✅ Note bien le code !');
  } catch (e) { setSaveMsg('Impossible de joindre le serveur 😕'); }
  renderCloudBox();
  updateCloudInfo();
});

$('cloudLink').addEventListener('click', async () => {
  const code = $('cloudInput').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(.{4})(.{4})$/, '$1-$2');
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return setSaveMsg('Le code ressemble à ABCD-EF23');
  try {
    const r = await api('GET', '/api/saves/' + code);
    if (r.status === 404) return setSaveMsg('Code inconnu 😕');
    if (r.status !== 200) throw new Error();
    if (!(await askConfirm('Récupérer la partie en ligne ? Elle remplace celle de cet appareil.', 'Récupérer'))) return;
    localStorage.setItem(SYNC_KEY, code);
    applyRemote(r.data.save, 'Partie récupérée en ligne ☁️');
  } catch (e) { setSaveMsg('Impossible de joindre le serveur 😕'); }
});

$('cloudCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(cloud.code); setSaveMsg('Code copié ✅'); }
  catch (e) { setSaveMsg('Code : ' + cloud.code); }
});

$('cloudOff2').addEventListener('click', async () => {
  if (!(await askConfirm('Arrêter la sauvegarde en ligne sur cet appareil ? La partie reste sur le téléphone et en ligne.', 'Arrêter'))) return;
  try { localStorage.removeItem(SYNC_KEY); } catch (e) { /* ignoré */ }
  cloud.code = null;
  cloud.lastPush = 0;
  $('saveInfo').textContent = '💾 Sauvegarde sur cet appareil';
  renderCloudBox();
});
