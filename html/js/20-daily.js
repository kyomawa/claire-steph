// =====================================================================
//  Défis du jour
// =====================================================================
const CHALLENGES = [
  { id: 'hug2', t: 'Faire 2 câlins', c: 'hugs', n: 2 },
  { id: 'meal3', t: 'Lui donner 3 repas', c: 'meals', n: 3 },
  { id: 'game1', t: 'Jouer à un mini-jeu', c: 'games', n: 1 },
  { id: 'stroke15', t: 'Le caresser (15 fois)', c: 'strokes', n: 15 },
  { id: 'tickle2', t: 'Le chatouiller 2 fois', c: 'tickles', n: 2 },
  { id: 'moment1', t: 'Un moment à deux', c: 'moments', n: 1 },
  { id: 'kiss10', t: '10 bisous', c: 'kisses', n: 10 },
  { id: 'wish1', t: 'Exaucer une de ses envies', c: 'wishes', n: 1 },
  { id: 'run1', t: 'Aller courir', c: 'runs', n: 1 },
  { id: 'wash1', t: 'Lui faire prendre une douche', c: 'washes', n: 1 },
  { id: 'code2', t: '2 sessions de code', c: 'codes', n: 2 },
  { id: 'answer1', t: 'Répondre à sa question du jour', c: 'answers', n: 1 }
];
const CH = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));

function ensureDaily() {
  const d = dayKey(now());
  if (state.daily && state.daily.day === d) return;
  const n = Math.floor(new Date(d).getTime() / DAY_MS);
  const picks = [];
  for (let k = n * 7; picks.length < 3; k += 5) {
    const c = CHALLENGES[((k % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
    if (!picks.includes(c.id)) picks.push(c.id);
  }
  state.daily = { day: d, base: { ...state.counters }, picks, done: {}, all: false };
}
const dailyProgress = (c) => Math.min(c.n, (state.counters[c.c] || 0) - (state.daily.base[c.c] || 0));

function checkDaily() {
  ensureDaily();
  const dl = state.daily;
  for (const id of dl.picks) {
    const c = CH[id];
    if (!c || dl.done[id] || dailyProgress(c) < c.n) continue;
    dl.done[id] = true;
    toast(`🎯 Défi réussi : ${c.t}`);
    earn(5);
    sfx.coin();
    gainXp(10);
  }
  if (!dl.all && dl.picks.every((id) => dl.done[id])) {
    dl.all = true;
    state.counters.dailyDone++;
    state.love = clamp(state.love + 10);
    toast('🏁 Tous les défis du jour réussis ! +25 XP');
    earn(10, 'bonus des défis');
    gainXp(25);
  }
  const nDone = dl.picks.filter((id) => dl.done[id]).length;
  $('hudDaily').textContent = `🎯 ${nDone}/3`;
  $('hudDaily').classList.toggle('done', dl.all);
}

const dailyModal = $('dailyModal');
function renderDaily() {
  ensureDaily();
  $('dailyList').replaceChildren(...state.daily.picks.map((id) => {
    const c = CH[id];
    const p = dailyProgress(c);
    const row = el('div', 'd-row' + (state.daily.done[id] ? ' ok' : ''));
    const bar = el('div', 'd-bar');
    const fill = el('div', 'd-fill');
    fill.style.width = Math.round((Math.max(0, p) / c.n) * 100) + '%';
    bar.appendChild(fill);
    row.append(el('div', 'd-title', (state.daily.done[id] ? '✅ ' : '') + c.t), bar, el('div', 'd-count', `${Math.max(0, p)} / ${c.n}`));
    return row;
  }));
  $('dailyFoot').textContent = state.daily.all ? 'Bravo, tout est fait pour aujourd’hui 🏁 Nouveaux défis demain !' : '+10 XP par défi, +25 XP et de l’amour si les 3 sont faits.';
}
$('hudDaily').addEventListener('click', () => { renderDaily(); dailyModal.hidden = false; });
$('dailyClose').addEventListener('click', () => { dailyModal.hidden = true; });
dailyModal.addEventListener('click', (e) => { if (e.target === dailyModal) dailyModal.hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dailyModal.hidden = true; });
