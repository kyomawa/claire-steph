// =====================================================================
//  État + sauvegarde
// =====================================================================
const STORAGE_KEY = 'cheriotchi_state';
let saveRestoring = false;
function freshState() {
  return {
    hunger: 78, energy: 78, happy: 78, love: 78,
    sick: false, sulk: false, poops: [], digest: 0,
    xp: 0, bestScore: 0, streak: 0,
    bornAt: Date.now(), lastSeen: null, lastVisitDay: null,
    counters: { hugs: 0, meals: 0, runs: 0, codes: 0, sleeps: 0, heals: 0, games: 0, kisses: 0, visits: 0, washes: 0, cleaned: 0, moments: 0, strokes: 0, tickles: 0, wishes: 0, answers: 0, cuddles: 0, herKisses: 0, dailyDone: 0, fetches: 0, selfies: 0, notesSent: 0, races: 0, notesGot: 0, purchases: 0, photos: 0 },
    bestGuess: 0, bestMemory: 0, bestMemoryStars: 0, bestDance: 0, bestDanceStars: 0, bestRace: 0, tokens: 0, postcards: {},
    trophies: {}, journal: [], name: null,
    album: {}, decor: 'auto', playedAt: 0, sound: true, seenHelp: false, lastAsk: null, daily: null,
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
function saveState() {
  if (saveRestoring) return;
  state.lastSeen = Date.now();
  state.name = petNameEl.textContent;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
}
petNameEl.addEventListener('blur', saveState);
petNameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); petNameEl.blur(); } });

// Le temps passe même jeu fermé : on rejoue les heures d'absence.
function catchUp(fromMs) {
  if (!fromMs) return 0;
  const gap = Date.now() - fromMs;
  if (gap < 2 * 60 * 1000) return 0;
  const hours = Math.min(gap / HOUR_MS, 72);
  let t = fromMs;
  let left = hours;
  let dayHours = 0;
  while (left > 0) {
    const dt = Math.min(1, left);
    if (phaseAt(new Date(t).getHours()) === 'night') {
      state.energy += 8 * dt; state.hunger -= 2.5 * dt; state.happy -= 1 * dt; state.love -= 1.5 * dt;
    } else {
      state.hunger -= 5 * dt; state.energy -= 3 * dt; state.happy -= 4 * dt; state.love -= 3 * dt;
      dayHours += dt;
      state.happy -= state.poops.length * 1.5 * dt;
      if (dayHours >= 5 && state.poops.length < 3) { dayHours -= 5; addPoop(); }
    }
    state.hunger = clamp(state.hunger); state.energy = clamp(state.energy);
    state.happy = clamp(state.happy); state.love = clamp(state.love);
    t += dt * HOUR_MS; left -= dt;
  }
  return gap / HOUR_MS;
}
