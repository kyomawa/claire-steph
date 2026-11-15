// =====================================================================
//  État + sauvegarde
// =====================================================================
const STORAGE_KEY = 'cheriotchi_state';
let saveRestoring = false;
function freshState() {
  return {
    hunger: 78, energy: 78, happy: 78, love: 78,
    sick: false, sulk: false, poops: [],
    weight: 70, discipline: 50, lights: true, digestQueue: [], alerts: {}, mistakes: [],
    activity: { sport: 0, food: 0, geek: 0, love: 0, party: 0 }, hungerZeroSince: 0, poopsFullSince: 0, awakeUntil: 0,
    gamePlays: null, capriceDay: null,
    // carrière (js/engine/career.js) et bilan de la semaine
    skills: { pilotage: 0, endurance: 0, cuisine: 0, code: 0, charme: 0 }, skillDay: null, career: null,
    history: {}, lastReport: null, streakPaid: null, bestGrade: null,
    xp: 0, bestScore: 0, streak: 0,
    bornAt: Date.now(), lastSeen: null, lastVisitDay: null,
    counters: { hugs: 0, meals: 0, runs: 0, codes: 0, sleeps: 0, heals: 0, games: 0, kisses: 0, visits: 0, washes: 0, cleaned: 0, moments: 0, strokes: 0, tickles: 0, wishes: 0, answers: 0, cuddles: 0, herKisses: 0, dailyDone: 0, fetches: 0, selfies: 0, notesSent: 0, races: 0, notesGot: 0, purchases: 0, photos: 0 },
    bestGuess: 0, bestMemory: 0, bestMemoryStars: 0, bestDance: 0, bestDanceStars: 0, bestRace: 0, tokens: 0, postcards: {},
    trophies: {}, journal: [], name: null,
    album: {}, decor: 'auto', playedAt: 0, sound: true, seenHelp: false, lastAsk: null, daily: null,
    tutorial: null, vibrate: true, reduceMotion: false,
    bestBugs: 0, bestRecipe: 0, bestLights: 0, advent: {}, newsSeen: null,
    car: { moteur: 0, pneus: 0, aero: 0, fiabilite: 0 },
    visitFreq: 'normal', lastVisitAt: 0,
    owned: {}, wear: { tete: null, yeux: null, visage: null, cou: null, dos: null, compagnon: null }
  };
}
let state = freshState();

const screenEl = $('screen');
const spriteEl = $('sprite');
const spriteHerEl = $('spriteHer');
const moodEl = $('mood');
const bubbleEl = $('bubble');
const petNameEl = $('petName');

let saveInfoAt = 0;
let saveTimer = null;
let lastWrite = 0;
// Les actions appellent saveState() très souvent : on regroupe les écritures (≤ 1 par seconde).
function saveState() {
  if (saveRestoring) return;
  const wait = 1000 - (Date.now() - lastWrite);
  if (wait > 0) {
    if (!saveTimer) saveTimer = setTimeout(() => { saveTimer = null; writeState(); }, wait);
    return;
  }
  writeState();
}
// Écriture immédiate (fermeture de l'appli, passage en arrière-plan)
function saveNow() { clearTimeout(saveTimer); saveTimer = null; writeState(); }
function writeState() {
  if (saveRestoring) return;
  lastWrite = Date.now();
  state.lastSeen = Date.now();
  state.name = petNameEl.textContent;
  try {
    if (typeof sanitize === 'function') sanitize(state);
    const data = JSON.stringify(state);
    if (typeof saveWithRoom === 'function') { if (!saveWithRoom(STORAGE_KEY, data)) throw new Error('stockage plein'); }
    else localStorage.setItem(STORAGE_KEY, data);
    if (typeof scheduleCloudPush === 'function') scheduleCloudPush();
    if (Date.now() - saveInfoAt > 4000 && !(cloud && cloud.code && cloud.lastPush)) {
      saveInfoAt = Date.now();
      const el = document.getElementById('saveInfo');
      if (el) el.textContent = `💾 Sauvegardé à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} sur cet appareil`;
    }
  } catch (e) {
    const el = document.getElementById('saveInfo');
    if (el) el.textContent = '⚠️ Sauvegarde impossible (navigation privée ?)';
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    const base = freshState();
    for (const k of Object.keys(base)) {
      if (d[k] === undefined || d[k] === null) continue;
      if (typeof base[k] === typeof d[k] || base[k] === null) state[k] = d[k];
    }
    state.counters = { ...base.counters, ...(d.counters || {}) };
    state.trophies = d.trophies || {};
    state.journal = Array.isArray(d.journal) ? d.journal : [];
    state.poops = Array.isArray(d.poops) ? d.poops.slice(0, 3) : [];
    state.owned = (d.owned && typeof d.owned === 'object') ? d.owned : {};
    state.album = (d.album && typeof d.album === 'object') ? d.album : {};
    state.wear = { ...base.wear, ...((d.wear && typeof d.wear === 'object') ? d.wear : {}) };
    if (d.name) petNameEl.textContent = d.name;
  } catch (e) { /* stockage indisponible */ }
  Sim.ensure(state);
  if (window.CheriCareer) window.CheriCareer.ensure(state);
}
petNameEl.addEventListener('blur', saveState);
petNameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); petNameEl.blur(); } });

// Le temps passe même jeu fermé : le moteur rejoue les heures d'absence (72 h max)
function catchUp(fromMs) {
  const to = Date.now();
  if (!fromMs || to - fromMs < 60 * 1000) return { hours: 0, events: [] };
  const events = Sim.simulate(state, fromMs, to, { hourOf: hourOfTs });
  return { hours: (to - fromMs) / HOUR_MS, events };
}
