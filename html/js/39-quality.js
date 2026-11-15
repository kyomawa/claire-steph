// =====================================================================
//  Fiabilité et confort : filet de sécurité, chien de garde, quitter un
//  mini-jeu, file d'attente des fenêtres, tutoriel, réglages
// =====================================================================

// ---- Journal technique (les erreurs imprévues ne figent plus le jeu) ----
const ERR_KEY = 'cheriotchi_errors';
function logError(msg) {
  try {
    const list = JSON.parse(localStorage.getItem(ERR_KEY) || '[]');
    list.push({ t: new Date().toISOString(), msg: String(msg).slice(0, 300) });
    localStorage.setItem(ERR_KEY, JSON.stringify(list.slice(-20)));
  } catch (e) { /* stockage indisponible */ }
}
window.addEventListener('error', (e) => logError(`${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => logError('promesse : ' + (e.reason && e.reason.message || e.reason)));

// La boucle de jeu et l'animation continuent même si une étape plante
function guard(fn, name) {
  return function guarded(...args) {
    try { return fn.apply(this, args); } catch (e) { logError(`${name} : ${e.message}`); return undefined; }
  };
}

// ---- Valeurs toujours valides (jamais de jauge « NaN ») ----
function sanitize(s) {
  const num = (v, d, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
  for (const k of ['hunger', 'energy', 'happy', 'love']) s[k] = num(s[k], 60, 0, 100);
  s.weight = num(s.weight, 70, 45, 110);
  s.discipline = num(s.discipline, 50, 0, 100);
  s.xp = num(s.xp, 0, 0, 1e9);
  s.tokens = num(s.tokens, 0, 0, 1e7);
  if (!Array.isArray(s.poops)) s.poops = [];
  s.poops = s.poops.filter(Number.isFinite).slice(0, 3);
  if (!Array.isArray(s.journal)) s.journal = [];
  if (s.journal.length > 400) s.journal = s.journal.slice(-400);
  if (s.skills) for (const k of Object.keys(s.skills)) s.skills[k] = num(s.skills[k], 0, 0, 100);
  return s;
}
sanitize(state);

// Si le stockage du téléphone est plein : on fait de la place puis on réessaie
const _setItem = Storage.prototype.setItem;
function saveWithRoom(key, value) {
  try { _setItem.call(localStorage, key, value); return true; } catch (e) {
    try {
      localStorage.removeItem('cheriotchi_photos');
      localStorage.removeItem(ERR_KEY);
      if (key === STORAGE_KEY) {
        state.journal = state.journal.slice(-120);
        const days = Object.keys(state.history || {}).sort();
        while (days.length > 10) delete state.history[days.shift()];
        value = JSON.stringify(state);
      }
      _setItem.call(localStorage, key, value);
      toast('Stockage presque plein : anciennes photos retirées pour garder la partie 💾');
      return true;
    } catch (e2) { return false; }
  }
}

// ---- Quitter un mini-jeu (sans récompense) ----
function quitGame() {
  if (!game.active) return;
  game.running = false;
  if (Array.isArray(game.items)) { game.items.forEach((it) => it.el && it.el.remove()); game.items = []; }
  gameEl.classList.remove('show');
  gameIntro.hidden = true;
  if (typeof race !== 'undefined') { race.on = false; race.over = true; cancelAnimationFrame(race.raf); raceEl.hidden = true; }
  if (typeof dance !== 'undefined') { cancelAnimationFrame(dance.raf); danceEl.hidden = true; }
  memEl.hidden = true;
  guessEl.hidden = true;
  spriteEl.style.visibility = '';
  game.active = false;
  busy = false;
  refreshHim(true);
  showBubble('On rejouera plus tard 😉', 1600);
}
$('quitGame').addEventListener('click', (e) => { e.stopPropagation(); quitGame(); });

// ---- Chien de garde : rien ne reste bloqué ----
let busySince = 0;
setInterval(guard(() => {
  $('quitGame').hidden = !game.active;
  if (!busy && !game.active) { busySince = 0; return; }
  if (!busySince) busySince = Date.now();
  const stuck = Date.now() - busySince;
  if (game.active && stuck > 6 * 60 * 1000) { logError('chien de garde : mini-jeu abandonné'); quitGame(); }
  else if (!game.active && stuck > 25 * 1000) {
    logError('chien de garde : action bloquée débloquée');
    actionVisual.classList.remove('show');
    hugVisual.classList.remove('show');
    spriteHerEl.classList.remove('visible');
    spriteEl.style.visibility = '';
    busy = false;
    girlBusy = false;
    busySince = 0;
    refreshHim(true);
  }
}, 'chien de garde'), 1000);

// ---- Fenêtres : une seule à la fois pour les apparitions automatiques ----
const modals = () => [...document.querySelectorAll('.modal')];
const openModals = () => modals().filter((m) => !m.hidden);
const popupQueue = [];
// à appeler pour les fenêtres qui s'ouvrent toutes seules (chapitre, bilan…)
function queuePopup(fn) { popupQueue.push(fn); }
setInterval(guard(() => {
  if (!popupQueue.length || openModals().length || busy || game.active) return;
  popupQueue.shift()();
}, 'file des fenêtres'), 600);

// Échap ferme seulement la fenêtre du dessus
const modalOrder = [];
new MutationObserver((muts) => {
  for (const m of muts) {
    const t = m.target;
    if (!t.classList.contains('modal')) continue;
    const i = modalOrder.indexOf(t);
    if (!t.hidden && i < 0) {
      modalOrder.push(t);
      const first = t.querySelector('.close, button');
      if (first) setTimeout(() => { try { first.focus({ preventScroll: true }); } catch (e) { /* ignoré */ } }, 50);
      if (isStandalone()) { try { history.pushState({ modal: t.id }, ''); } catch (e) { /* ignoré */ } }
    } else if (t.hidden && i >= 0) modalOrder.splice(i, 1);
  }
}).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });

function closeTopModal() {
  const top = modalOrder[modalOrder.length - 1];
  if (!top || top.id === 'confirmBox') return false;
  const btn = top.querySelector('.close') || top.querySelector('#chapterOk, #helpOk');
  if (btn) btn.click(); else top.hidden = true;
  return true;
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  e.stopImmediatePropagation();
  closeTopModal();
}, true);
// bouton « retour » d'Android dans l'appli installée
window.addEventListener('popstate', () => { closeTopModal(); });

// ---- Tutoriel des premiers pas ----
const TUTO = [
  { target: 'btnCoffee', text: 'Il a faim ! Choisis-lui un plat 🍽️', done: () => state.counters.meals > 0 },
  { target: 'btnHug', text: 'Un câlin pour lui montrer que tu es là 🥰', done: () => state.counters.hugs > 0 },
  { target: 'btnGame', text: 'Joue avec lui à un mini-jeu 🎮', done: () => state.counters.games > 0 }
];
const tipEl = $('coachTip');
let tutoShown = -1;
function renderTuto() {
  document.querySelectorAll('.coach').forEach((e) => e.classList.remove('coach'));
  if (state.tutorial === 'done' || openModals().length || game.active) { tipEl.hidden = true; return; }
  let step = Number(state.tutorial) || 0;
  while (step < TUTO.length && TUTO[step].done()) step++;
  if (step !== state.tutorial) state.tutorial = step;
  if (step >= TUTO.length) {
    state.tutorial = 'done';
    tipEl.hidden = true;
    toast('🎓 Tu sais l’essentiel ! +20 ⛽');
    earn(20);
    saveState();
    return;
  }
  const t = TUTO[step];
  const target = $(t.target);
  target.classList.add('coach');
  $('coachText').textContent = `${step + 1}/3 · ${t.text}`;
  tipEl.hidden = false;
  // sous le bouton (les jauges restent visibles), flèche centrée sur lui
  const r = target.getBoundingClientRect(), d = document.querySelector('.device').getBoundingClientRect();
  const w = tipEl.offsetWidth || 240;
  const center = r.left - d.left + r.width / 2;
  const left = Math.max(8, Math.min(d.width - w - 8, center - w / 2));
  tipEl.style.left = left + 'px';
  tipEl.style.top = (r.bottom - d.top + 10) + 'px';
  tipEl.style.setProperty('--arrow-x', Math.max(16, Math.min(w - 16, center - left)) + 'px');
  if (step !== tutoShown) {
    tutoShown = step;
    try { tipEl.scrollIntoView({ block: 'nearest', behavior: state.reduceMotion ? 'auto' : 'smooth' }); } catch (e) { /* ignoré */ }
  }
}
// les joueurs déjà avancés n'ont pas le tutoriel
if (state.tutorial === undefined || state.tutorial === null) state.tutorial = (state.counters.meals > 0 && state.counters.hugs > 0) ? 'done' : 0;
$('coachSkip').addEventListener('click', (e) => { e.stopPropagation(); state.tutorial = 'done'; renderTuto(); saveState(); });
setInterval(guard(renderTuto, 'tutoriel'), 700);

// ---- Réglages : vibrations, animations ----
function applyPrefs() {
  document.documentElement.classList.toggle('reduce-motion', !!state.reduceMotion);
  $('prefVibrate').checked = state.vibrate !== false;
  $('prefMotion').checked = !!state.reduceMotion;
  $('prefSound').checked = state.sound !== false;
}
$('prefVibrate').addEventListener('change', (e) => { state.vibrate = e.target.checked; if (state.vibrate) buzz(30); saveState(); });
$('prefMotion').addEventListener('change', (e) => { state.reduceMotion = e.target.checked; applyPrefs(); saveState(); });
$('prefSound').addEventListener('change', (e) => { state.sound = e.target.checked; renderSoundBtn(); saveState(); });
$('btnSound').addEventListener('click', () => setTimeout(applyPrefs, 0));
applyPrefs();

// ---- Écran d'accueil : disparaît dès que le jeu est prêt ----
(function splash() {
  const sp = $('splash');
  $('splashFace').src = A.himHappy;
  const hide = () => { sp.classList.add('hide'); setTimeout(() => sp.remove(), 600); };
  if (document.readyState === 'complete') setTimeout(hide, 500); else window.addEventListener('load', () => setTimeout(hide, 400));
  setTimeout(hide, 2500);
}());

// ---- Journal technique visible dans 💾 (utile pour me signaler un souci) ----
$('showErrors').addEventListener('click', () => {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(ERR_KEY) || '[]'); } catch (e) { list = []; }
  $('errorsBox').textContent = list.length ? list.map((x) => `${x.t.slice(5, 16).replace('T', ' ')} · ${x.msg}`).join('\n') : 'Aucun souci enregistré 👍';
  $('errorsBox').hidden = false;
});
