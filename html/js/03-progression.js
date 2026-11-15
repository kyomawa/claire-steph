// =====================================================================
//  Progression : niveaux, trophées, carnet
// =====================================================================
const xpFloor = (lvl) => 25 * (lvl - 1) * lvl;   // niv 2 = 50, 3 = 150, 4 = 300, 5 = 500…
function levelFor(xp) { let n = 1; while (xp >= xpFloor(n + 1)) n++; return n; }

function daysTogether() {
  if (CONFIG.coupleStart) {
    const [y, m, d] = CONFIG.coupleStart.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    return Math.max(0, Math.floor((now() - start) / DAY_MS));
  }
  const born = new Date(state.bornAt); born.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((now() - born) / DAY_MS) + 1);
}

const TROPHIES = [
  { id: 'first_hug', e: '🥰', t: 'Premier câlin', d: 'Faire un câlin', ok: (s) => s.counters.hugs >= 1 },
  { id: 'hugs_50', e: '💞', t: 'Pot de colle', d: '50 câlins', ok: (s) => s.counters.hugs >= 50 },
  { id: 'meals_30', e: '🍽️', t: 'Bon vivant', d: '30 repas', ok: (s) => s.counters.meals >= 30 },
  { id: 'runs_20', e: '🏃', t: 'Marathonien', d: '20 runs', ok: (s) => s.counters.runs >= 20 },
  { id: 'codes_20', e: '💻', t: 'Chasseur de bugs', d: '20 sessions de code', ok: (s) => s.counters.codes >= 20 },
  { id: 'kisses_100', e: '💋', t: 'Bisou-maniaque', d: '100 bisous (tape sur lui)', ok: (s) => s.counters.kisses >= 100 },
  { id: 'healed', e: '💊', t: "Docteur d'amour", d: 'Le soigner quand il est malade', ok: (s) => s.counters.heals >= 1 },
  { id: 'game_15', e: '🎮', t: 'Attrapeur pro', d: '15 points au mini-jeu', ok: (s) => s.bestScore >= 15 },
  { id: 'game_30', e: '🏅', t: 'Légende des bisous', d: '30 points au mini-jeu', ok: (s) => s.bestScore >= 30 },
  { id: 'streak_7', e: '🔥', t: 'Une semaine fidèle', d: '7 jours de suite', ok: (s) => s.streak >= 7 },
  { id: 'days_30', e: '🗓️', t: 'Un mois ensemble', d: 'Jour 30', ok: () => daysTogether() >= 30 },
  { id: 'level_5', e: '⭐', t: 'Niveau 5', d: 'Atteindre le niveau 5', ok: (s) => levelFor(s.xp) >= 5 },
  { id: 'perfect', e: '🌟', t: 'Au top du top', d: 'Toutes les jauges au-dessus de 90', ok: (s) => Math.min(s.hunger, s.energy, s.happy, s.love) > 90 },
  { id: 'night_owl', e: '🦉', t: 'Couche-tard', d: "S'occuper de lui entre minuit et 5 h", ok: (s) => !!s.trophies.night_owl },
  { id: 'special', e: '🎁', t: 'Jour spécial', d: 'Ouvrir le jeu un jour de fête', ok: (s) => !!s.trophies.special },
  { id: 'washes_10', e: '🧼', t: 'Propre comme un sou neuf', d: '10 bains', ok: (s) => s.counters.washes >= 10 },
  { id: 'cleaned_20', e: '💩', t: 'Ramasse-crottes', d: '20 cacas ramassés', ok: (s) => s.counters.cleaned >= 20 },
  { id: 'style_4', e: '👕', t: 'Fashion week', d: 'Porter 4 accessoires à la fois', ok: (s) => Object.values(s.wear).filter(Boolean).length >= 4 },
  { id: 'moments_10', e: '💑', t: 'Inséparables', d: '10 moments à deux', ok: (s) => s.counters.moments >= 10 },
  { id: 'album_all', e: '📸', t: 'Album complet', d: "Tous les moments de l'album", ok: (s) => Object.keys(s.album).length >= 16 },
  { id: 'strokes_100', e: '🤲', t: 'Pro des papouilles', d: '100 caresses (frotte-le)', ok: (s) => s.counters.strokes >= 100 },
  { id: 'tickles_20', e: '😂', t: 'Roi des chatouilles', d: '20 chatouilles (3 tapes rapides)', ok: (s) => s.counters.tickles >= 20 },
  { id: 'wishes_10', e: '🧞', t: 'Génie de la lampe', d: 'Exaucer 10 de ses envies', ok: (s) => s.counters.wishes >= 10 },
  { id: 'guess_5', e: '🔮', t: 'Télépathe', d: '5 / 5 à « Gauche ou droite »', ok: (s) => s.bestGuess >= 5 },
  { id: 'daily_5', e: '🏁', t: 'Assidu', d: '5 journées de défis réussies', ok: (s) => s.counters.dailyDone >= 5 },
  { id: 'answers_10', e: '💬', t: 'On se dit tout', d: 'Répondre à 10 questions du jour', ok: (s) => s.counters.answers >= 10 },
  { id: 'fetch_10', e: '🎾', t: 'Bon chien !', d: '10 balles rapportées par son compagnon', ok: (s) => s.counters.fetches >= 10 },
  { id: 'selfie_5', e: '📸', t: 'Paparazzi', d: '5 selfies avec elle', ok: (s) => s.counters.selfies >= 5 },
  { id: 'memory_3', e: '🧠', t: 'Mémoire d’éléphant', d: '3 étoiles au jeu de Mémoire', ok: (s) => s.bestMemoryStars >= 3 },
  { id: 'dance_3', e: '🪩', t: 'Rois de la piste', d: '3 étoiles à la Danse', ok: (s) => s.bestDanceStars >= 3 },
  { id: 'race_25', e: '🏎️', t: 'Pilote Gulf', d: '25 points à la Course Gulf', ok: (s) => (s.bestRace || 0) >= 25 },
  { id: 'note_1', e: '💌', t: 'Facteur de l’amour', d: 'Recevoir un mot doux', ok: (s) => s.counters.notesGot >= 1 },
  { id: 'postcards_8', e: '✈️', t: 'Globe-trotteurs', d: '8 cartes postales', ok: (s) => Object.keys(s.postcards || {}).length >= 8 },
  { id: 'shop_5', e: '🛍️', t: 'Client fidèle', d: '5 achats à la boutique', ok: (s) => s.counters.purchases >= 5 },
  { id: 'photo_5', e: '📷', t: 'Photographe', d: '5 photos souvenirs', ok: (s) => s.counters.photos >= 5 },
  { id: 'gp_first', e: '🏁', t: 'Premier départ', d: 'Courir un Grand Prix', ok: (s) => s.career && s.career.races >= 1 },
  { id: 'gp_win', e: '🥇', t: 'Première victoire', d: 'Gagner un Grand Prix', ok: (s) => s.career && s.career.wins >= 1 },
  { id: 'gp_podium5', e: '🏆', t: 'Habitué du podium', d: '5 podiums en Grand Prix', ok: (s) => s.career && s.career.podiums >= 5 },
  { id: 'lemans', e: '🌙', t: 'Vainqueur au Mans', d: 'Gagner le Grand Prix du Mans', ok: (s) => s.career && (s.career.winsAt.lemans || 0) >= 1 },
  { id: 'story', e: '📖', t: 'Le rêve réalisé', d: 'Finir l’histoire « Le rêve du Mans »', ok: (s) => !!(s.career && s.career.chapters.c7) },
  { id: 'week_s', e: '📈', t: 'Semaine parfaite', d: 'Obtenir S au bilan de la semaine', ok: (s) => s.bestGrade === 'S' },
  { id: 'memories_10', e: '📖', t: 'Album souvenir', d: '10 souvenirs dans le carnet', ok: (s) => s.journal.length >= 10 },
  { id: 'garage_1', e: '🔧', t: 'Premier réglage', d: 'Améliorer une pièce de sa voiture', ok: (s) => !!s.car && Object.values(s.car).some((v) => v >= 1) },
  { id: 'garage_max', e: '🏎️', t: 'Voiture de course', d: 'Toutes les pièces au niveau 5', ok: (s) => !!s.car && ['moteur', 'pneus', 'aero', 'fiabilite'].every((k) => s.car[k] >= 5) },
  { id: 'rain_win', e: '☔', t: 'Roi de la pluie', d: 'Gagner un Grand Prix sous la pluie', ok: (s) => !!(s.career && s.career.rainWins >= 1) },
  { id: 'champion', e: '👑', t: 'Champion du monde', d: 'Finir un championnat à la 1ʳᵉ place', ok: (s) => !!(s.career && s.career.seasons.some((x) => x.pos === 1)) },
  { id: 'bugs_22', e: '🐞', t: 'Débuggeur fou', d: '22 points à la Chasse aux bugs', ok: (s) => (s.bestBugs || 0) >= 22 },
  { id: 'recipe_6', e: '👨‍🍳', t: 'Chef étoilé', d: '6 plats réussis à la Recette à deux', ok: (s) => (s.bestRecipe || 0) >= 6 },
  { id: 'lights_300', e: '🚦', t: 'Réflexes de pilote', d: 'Moins de 0,30 s aux Feux de départ', ok: (s) => s.bestLights > 0 && s.bestLights < 300 },
  { id: 'advent_24', e: '🎄', t: 'Esprit de Noël', d: 'Ouvrir les 24 cases du calendrier de l’Avent', ok: (s) => Object.keys((s.advent || {})[String(now().getFullYear())] || {}).length >= 24 }
];

function unlock(id) {
  if (state.trophies[id]) return;
  state.trophies[id] = dayKey(now());
  const t = TROPHIES.find((x) => x.id === id);
  if (t) { toast(`Trophée débloqué : ${t.e} ${t.t}`, A.icoTrophy); try { sfx.coin(); } catch (e) { /* init */ } }
}
function checkTrophies() {
  for (const t of TROPHIES) if (!state.trophies[t.id] && t.ok(state)) unlock(t.id);
  checkUnlocks();
  if (typeof checkWish === 'function' && wish) setTimeout(checkWish, 0);
  if (typeof checkDaily === 'function') checkDaily();
}

function gainXp(n) {
  if (!n) return;
  if (state.discipline > 70) n = Math.round(n * 1.1);
  const before = levelFor(state.xp);
  state.xp += n;
  const after = levelFor(state.xp);
  if (after > before) {
    toast(rankFor(after) !== rankFor(before) ? `Niveau ${after} : ${rankFor(after)} ! 🏁` : `Niveau ${after} ! Bravo 🎉`, A.icoGrow);
    if (typeof earn === 'function') earn(10, 'cadeau de niveau');
    const no = document.getElementById('raceNo');
    if (no) { no.classList.remove('spin'); void no.offsetWidth; no.classList.add('spin'); confetti(no, 34); }
    try { sfx.level(); buzz([30, 50, 30]); } catch (e) { /* init */ }
    setTimeout(() => {
      showBubble(`Niveau ${after} ! 🎉`, 2200);
      strikePose(A.himJump, 'pose-jump', 1400);
      ['icoGrow', '🎉', '✨'].forEach((e, i) => setTimeout(() => spawnHeart(spriteEl.style.left, `${70 + i * 12}px`, e, true), i * 180));
    }, 400);
  }
}

function addMemory(msg, kind) {
  const d = dayKey(now());
  if (state.journal.some((m) => m.d === d && m.msg === msg)) return false;
  state.journal.push({ d, msg, kind: kind || 'note' });
  if (state.journal.length > 400) state.journal.shift();
  return true;
}

function noteOfTheDay() {
  const n = Math.floor(new Date(dayKey(now())).getTime() / DAY_MS);
  return CONFIG.dailyNotes[((n % CONFIG.dailyNotes.length) + CONFIG.dailyNotes.length) % CONFIG.dailyNotes.length];
}
const specialToday = () => CONFIG.specialDates[mdKey(now())] || null;
