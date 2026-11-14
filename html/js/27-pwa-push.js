// =====================================================================
//  Application installable + notifications
// =====================================================================
const PUSH_KEY = 'cheriotchi_push';
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol.startsWith('http');
const pushOn = () => { try { return localStorage.getItem(PUSH_KEY) === '1'; } catch (e) { return false; } };

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* pas grave */ });
}

function b64ToBytes(b64) {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(s);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function renderPushBox() {
  let txt;
  const on = pushOn();
  let canEnable = false;
  if (!cloud.available) txt = 'Il faut ouvrir le jeu depuis son adresse en ligne (avec le serveur).';
  else if (isIos && !isStandalone()) txt = 'Sur iPhone : ajoute d’abord le jeu à l’écran d’accueil (Partager → « Sur l’écran d’accueil »), puis ouvre-le depuis l’icône.';
  else if (!pushSupported()) txt = 'Ce navigateur ne gère pas les notifications.';
  else if (Notification.permission === 'denied') txt = 'Notifications bloquées : autorise-les dans les réglages du téléphone.';
  else if (on) txt = '✅ Activées : il te prévient quand il a faim, est malade ou que tu lui manques. Jamais la nuit (22 h – 8 h).';
  else { txt = 'Désactivées. Il peut te prévenir quand il a besoin de toi 🔔'; canEnable = true; }
  $('pushStatus').textContent = txt;
  $('pushOn').hidden = !canEnable;
  $('pushTest').hidden = !on;
  $('pushOff').hidden = !on;
}

async function ensureCloudCode() {
  if (cloud.code) return true;
  saveState();
  const r = await api('POST', '/api/saves', { save: state });
  if (r.status !== 201) return false;
  cloud.code = r.data.code;
  cloud.lastPush = Date.now();
  cloud.pushedPlayedAt = playedOf(state);
  localStorage.setItem(SYNC_KEY, cloud.code);
  return true;
}

$('pushOn').addEventListener('click', async () => {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { setSaveMsg('Notifications refusées 😕'); return renderPushBox(); }
    if (!(await ensureCloudCode())) throw new Error('cloud');
    const reg = await navigator.serviceWorker.ready;
    const key = await api('GET', '/api/push/key');
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key.data.publicKey) });
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
    const r = await api('POST', '/api/push/subscribe', { code: cloud.code, subscription: sub.toJSON(), tz });
    if (r.status !== 200) throw new Error('subscribe');
    localStorage.setItem(PUSH_KEY, '1');
    setSaveMsg('Notifications activées 🔔');
    sfx.coin();
  } catch (e) { setSaveMsg('Impossible d’activer les notifications 😕'); }
  renderPushBox();
  renderCloudBox();
});

$('pushTest').addEventListener('click', async () => {
  try {
    const r = await api('POST', '/api/push/test', { code: cloud.code });
    setSaveMsg(r.data && r.data.sent ? 'Notification envoyée, regarde ton téléphone 📲' : 'Aucune notification envoyée 😕');
  } catch (e) { setSaveMsg('Serveur injoignable 😕'); }
});

$('pushOff').addEventListener('click', async () => {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api('POST', '/api/push/unsubscribe', { code: cloud.code, endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
  } catch (e) { /* ignoré */ }
  try { localStorage.removeItem(PUSH_KEY); } catch (e) { /* ignoré */ }
  setSaveMsg('Notifications désactivées');
  renderPushBox();
});
