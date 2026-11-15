// =====================================================================
//  Calendrier de l'Avent : une case par jour du 1er au 24 décembre
//  (les cases oubliées restent ouvrables jusqu'au 31). Mots dans CONFIG.adventMessages.
// =====================================================================
const ADVENT = [
  { e: '⛽', tokens: 10 },
  { e: '☕', n: 'Chocolat chaud', d: { happy: 12, energy: 10 } },
  { e: '💌' },
  { e: '⛽', tokens: 15 },
  { e: '⭐', xp: 25 },
  { e: '🍪', n: 'Biscuits de Noël', d: { hunger: 15, happy: 8 } },
  { e: '💌' },
  { e: '🧣', n: 'Câlin sous le plaid', d: { love: 20, happy: 6 } },
  { e: '⛽', tokens: 20 },
  { e: '💌' },
  { e: '🍊', n: 'Clémentines', d: { hunger: 10, energy: 6 } },
  { e: '⭐', xp: 30 },
  { e: '💌' },
  { e: '⛽', tokens: 20 },
  { e: '❄️', n: 'Bataille de boules de neige', d: { happy: 18, love: 8, energy: -6 } },
  { e: '💌' },
  { e: '🥨', n: 'Bretzel du marché de Noël', d: { hunger: 14, happy: 8 } },
  { e: '⛽', tokens: 25 },
  { e: '💌' },
  { e: '⭐', xp: 35 },
  { e: '🎬', n: 'Film de Noël sous la couette', d: { love: 15, happy: 12, energy: 5 } },
  { e: '💌' },
  { e: '⛽', tokens: 30 },
  { e: '🎁', tokens: 50, big: true }
];
const adventModal = $('adventModal');

// jour de décembre (0 en dehors de décembre) et cases ouvertes cette année
function adventDay() { const d = now(); return d.getMonth() === 11 ? d.getDate() : 0; }
function adventOpened() {
  const y = String(now().getFullYear());
  if (!state.advent || typeof state.advent !== 'object') state.advent = {};
  if (!state.advent[y]) state.advent[y] = {};
  return state.advent[y];
}
function canOpenDoor(n) { const day = adventDay(); return day > 0 && n <= Math.min(day, 24) && !adventOpened()[n]; }
function doorsWaiting() { let c = 0; for (let n = 1; n <= 24; n++) if (canOpenDoor(n)) c++; return c; }

function renderAdventBtn() {
  const btn = $('btnAdvent');
  btn.hidden = adventDay() === 0;
  btn.classList.toggle('has-gift', doorsWaiting() > 0);
}

function renderAdvent() {
  const day = adventDay();
  const opened = adventOpened();
  const waiting = doorsWaiting();
  $('adventSub').textContent = day > 24
    ? (waiting ? `Il reste ${waiting} case${waiting > 1 ? 's' : ''} à ouvrir avant la fin de l’année 🎁` : 'Toutes les cases sont ouvertes. Joyeuses fêtes ! 🎄')
    : `Jour ${day} · ${waiting ? `${waiting} case${waiting > 1 ? 's' : ''} à ouvrir` : 'reviens demain pour la suivante'} 🎁`;
  $('adventGrid').replaceChildren(...ADVENT.map((r, i) => {
    const n = i + 1;
    const b = el('button', 'advent-door');
    if (opened[n]) { b.classList.add('open'); b.append(el('span', 'door-n', String(n)), el('span', 'door-e', r.e)); }
    else if (canOpenDoor(n)) { b.classList.add('ready'); b.append(el('span', 'door-n', String(n))); }
    else { b.classList.add('locked'); b.disabled = true; b.append(el('span', 'door-n', String(n)), el('span', 'door-lock', '🔒')); }
    if (n === 24) b.classList.add('big');
    b.setAttribute('aria-label', `Case ${n}${opened[n] ? ' (ouverte)' : ''}`);
    b.addEventListener('click', () => (opened[n] ? showDoor(n, false) : openDoor(n)));
    return b;
  }));
}

function doorText(n) {
  const r = ADVENT[n - 1];
  if (r.big) return `+${r.tokens} ⛽ et un souvenir spécial`;
  if (r.tokens) return `+${r.tokens} ⛽`;
  if (r.xp) return `+${r.xp} XP ⭐`;
  if (r.d) return `${r.n} : ${deltaText(r.d)}`;
  return 'Un mot doux, rangé dans le carnet 📖';
}

function showDoor(n, fresh) {
  const r = ADVENT[n - 1];
  const msg = (CONFIG.adventMessages || [])[n - 1] || 'Joyeux Noël 🎄';
  const box = $('adventReveal');
  box.replaceChildren(el('div', 'reveal-e', r.e), el('div', 'reveal-n', `Case ${n}`), el('p', 'reveal-msg', msg), el('p', 'reveal-gift', doorText(n)));
  box.hidden = false;
  box.classList.remove('pop');
  void box.offsetWidth;
  if (fresh) box.classList.add('pop');
}

function openDoor(n) {
  if (!canOpenDoor(n)) return;
  const r = ADVENT[n - 1];
  adventOpened()[n] = dayKey(now());
  const msg = (CONFIG.adventMessages || [])[n - 1] || 'Joyeux Noël 🎄';
  if (r.tokens) earn(r.tokens, r.big ? 'grand cadeau de l’Avent 🎁' : 'calendrier de l’Avent');
  if (r.xp) gainXp(r.xp);
  if (r.d) {
    const before = snap();
    for (const [k, v] of Object.entries(r.d)) state[k] = clamp(state[k] + v);
    renderStats();
    showDeltas(before);
  }
  addMemory(`🎄 Case ${n} : ${msg}`, r.big ? 'special' : 'note');
  sfx.coin();
  buzz(30);
  if (r.big) { confetti($('btnAdvent'), 40); sfx.level(); }
  showDoor(n, true);
  renderAdvent();
  renderAdventBtn();
  checkTrophies();
  saveState();
}

$('btnAdvent').addEventListener('click', () => {
  $('adventReveal').hidden = true;
  renderAdvent();
  adventModal.hidden = false;
});
$('adventClose').addEventListener('click', () => { adventModal.hidden = true; });
adventModal.addEventListener('click', (e) => { if (e.target === adventModal) adventModal.hidden = true; });

renderAdventBtn();
setInterval(guard(renderAdventBtn, 'calendrier'), 60 * 1000);
if (canOpenDoor(Math.min(adventDay(), 24))) setTimeout(() => toast('🎄 Une case du calendrier de l’Avent t’attend !'), 2600);
