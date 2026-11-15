// =====================================================================
//  Mini-jeu : Mémoire
// =====================================================================
const memEl = $('memory');
const MEM_ICONS = ['icoHeart', 'icoCake', 'icoGift', 'icoHunger', 'icoHappy', 'icoTrophy', 'icoLove', 'icoHome', 'icoNote', 'toyBall', 'icoThirst', 'decoPumpkin'];
const mem = { cards: [], open: [], found: 0, moves: 0, lock: false };

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function startMemory() {
  if (!canAct()) return;
  beginGame();
  const icons = shuffle(MEM_ICONS.filter((k) => A[k]).slice()).slice(0, 6);
  mem.cards = shuffle([...icons, ...icons].map((k) => ({ k, done: false })));
  mem.open = [];
  mem.found = 0;
  mem.moves = 0;
  mem.lock = false;
  $('memGrid').replaceChildren(...mem.cards.map((c, i) => {
    const b = el('button', 'mem-card');
    b.setAttribute('aria-label', 'Carte');
    const front = el('img', 'mem-front');
    front.src = A[c.k];
    front.alt = '';
    b.append(el('span', 'mem-back', '⛽'), front);
    b.addEventListener('click', (e) => { e.stopPropagation(); flipMem(i, b); });
    c.btn = b;
    return b;
  }));
  $('memInfo').textContent = 'Retrouve les paires ! · 0 coup';
  memEl.hidden = false;
}

function flipMem(i, b) {
  const c = mem.cards[i];
  if (mem.lock || c.done || mem.open.includes(i)) return;
  b.classList.add('flipped');
  sfx.tap();
  mem.open.push(i);
  if (mem.open.length < 2) return;
  mem.moves++;
  const [a1, a2] = mem.open.map((k) => mem.cards[k]);
  if (a1.k === a2.k) {
    a1.done = a2.done = true;
    a1.btn.classList.add('done');
    a2.btn.classList.add('done');
    mem.found++;
    mem.open = [];
    sfx.coin();
    if (mem.found === 6) setTimeout(endMemory, 500);
  } else {
    mem.lock = true;
    setTimeout(() => {
      a1.btn.classList.remove('flipped');
      a2.btn.classList.remove('flipped');
      mem.open = [];
      mem.lock = false;
    }, 750);
  }
  $('memInfo').textContent = `${mem.found} / 6 paires · ${mem.moves} coup${mem.moves > 1 ? 's' : ''}`;
}

function endMemory() {
  const stars = mem.moves <= 9 ? 3 : (mem.moves <= 13 ? 2 : 1);
  const record = !state.bestMemory || mem.moves < state.bestMemory;
  if (record) state.bestMemory = mem.moves;
  state.bestMemoryStars = Math.max(state.bestMemoryStars || 0, stars);
  $('memInfo').textContent = `${'⭐'.repeat(stars)} en ${mem.moves} coups${record ? ' · record !' : ''}`;
  const before = snap();
  state.happy = clamp(state.happy + stars * 6);
  state.love = clamp(state.love + stars * 2);
  state.energy = clamp(state.energy - 4);
  state.counters.games++;
  sfx.level();
  const mult = playMult('memory');
  trainFor('game_memory', mult);
  act('geek', 3);
  gainXp(Math.round((4 + stars * 3) * mult));
  earn(Math.round(stars * 4 * mult) + geekBonus(), 'au Mémoire');
  updateConditions(true);
  renderStats();
  showDeltas(before);
  checkTrophies();
  endGameLater(() => { memEl.hidden = true; }, 2200);
}
