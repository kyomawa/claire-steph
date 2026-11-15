// =====================================================================
//  Mini-jeu : Chasse aux bugs (entraîne le code)
//  Des bugs sortent de son code : on les écrase, on évite les bombes.
// =====================================================================
const bugsEl = $('bugs');
const BUGS_TIME = 20;                       // secondes
const BUG_KINDS = [
  { e: '🐛', v: 1, w: 6, life: [950, 1350] },
  { e: '🪲', v: 2, w: 2, life: [650, 900] },          // plus rapide, rapporte plus
  { e: '☕', v: 0, w: 1, life: [900, 1200], bonus: 2 }, // +2 secondes
  { e: '💣', v: -2, w: 2, life: [1100, 1500] }        // à ne pas toucher
];
const BUG_CODE = ['if (love)', 'while (true)', 'return 💕;', 'const café', 'git push', 'npm test', '// TODO', 'let bisou', 'await toi'];
const bugHunt = { timer: 0, cells: [], score: 0, squashed: 0, end: 0, nextAt: 0, over: true };

function pickWeighted(list) {
  const total = list.reduce((a, k) => a + k.w, 0);
  let r = Math.random() * total;
  for (const k of list) { r -= k.w; if (r <= 0) return k; }
  return list[0];
}

function startBugs() {
  if (!canAct()) return;
  beginGame();
  bugHunt.score = 0;
  bugHunt.squashed = 0;
  bugHunt.over = false;
  bugHunt.cells = [];
  $('bugsGrid').replaceChildren(...BUG_CODE.map((code, i) => {
    const b = el('button', 'bug-cell');
    b.setAttribute('aria-label', `Ligne ${12 + i * 7}`);
    b.append(el('span', 'bug-line', String(12 + i * 7)), el('span', 'bug-code', code));
    const it = el('span', 'bug-item');
    b.appendChild(it);
    const hit = (e) => { e.stopPropagation(); e.preventDefault(); hitBug(i); };
    b.addEventListener('pointerdown', hit);
    b.addEventListener('click', (e) => { e.stopPropagation(); if (e.detail === 0) hitBug(i); });   // clavier
    bugHunt.cells.push({ b, it, kind: null, until: 0 });
    return b;
  }));
  $('bugsMsg').textContent = 'Écrase les bugs 🐛🪲 · pas les bombes 💣 · ☕ = +2 s';
  const t0 = performance.now() + 1300;      // le temps de lire la consigne
  bugHunt.end = t0 + BUGS_TIME * 1000;
  bugHunt.nextAt = t0;
  renderBugsInfo();
  bugsEl.hidden = false;
  clearInterval(bugHunt.timer);
  bugHunt.timer = setInterval(guard(bugsTick, 'chasse aux bugs'), 50);
}

function renderBugsInfo() {
  const left = Math.max(0, Math.ceil((bugHunt.end - performance.now()) / 1000));
  $('bugsInfo').textContent = `🐛 ${bugHunt.score} pt${bugHunt.score > 1 ? 's' : ''} · ⏱ ${Math.min(left, BUGS_TIME + 9)} s`;
}

function clearBug(c) {
  c.kind = null;
  c.b.classList.remove('up', 'bomb');
}

function bugsTick() {
  if (bugHunt.over) return;
  const t = performance.now();
  for (const c of bugHunt.cells) if (c.kind && t > c.until) clearBug(c);
  if (t >= bugHunt.end) { endBugs(); return; }
  if (t >= bugHunt.nextAt) {
    const progress = Math.min(1, Math.max(0, 1 - (bugHunt.end - t) / (BUGS_TIME * 1000)));
    const free = bugHunt.cells.filter((c) => !c.kind);
    if (free.length > 6) {                  // au plus 3 objets en même temps
      const c = pick(free);
      const k = pickWeighted(BUG_KINDS);
      c.kind = k;
      c.until = t + rand(k.life[0], k.life[1]) * (1 - progress * 0.3);
      c.it.textContent = k.e;
      c.b.classList.add('up');
      c.b.classList.toggle('bomb', k.v < 0);
    }
    bugHunt.nextAt = t + rand(430, 720) * (1 - progress * 0.35);
  }
  renderBugsInfo();
}

function bugPop(cell, text) {
  const p = el('span', 'bug-pop', text);
  cell.appendChild(p);
  setTimeout(() => p.remove(), 650);
}

function hitBug(i) {
  if (bugHunt.over) return;
  const c = bugHunt.cells[i];
  if (!c || !c.kind) return;
  const k = c.kind;
  clearBug(c);
  if (k.bonus) {
    bugHunt.end += k.bonus * 1000;
    bugPop(c.b, `+${k.bonus} s`);
    sfx.coin();
  } else if (k.v > 0) {
    bugHunt.score += k.v;
    bugHunt.squashed++;
    bugPop(c.b, `+${k.v}`);
    c.b.classList.add('splat');
    setTimeout(() => c.b.classList.remove('splat'), 220);
    sfx.tap();
  } else {
    bugHunt.score = Math.max(0, bugHunt.score + k.v);
    bugPop(c.b, `${k.v}`);
    c.b.classList.add('boom');
    setTimeout(() => c.b.classList.remove('boom'), 300);
    sfx.bad();
    buzz(40);
  }
  renderBugsInfo();
}

function endBugs() {
  if (bugHunt.over) return;
  bugHunt.over = true;
  clearInterval(bugHunt.timer);
  bugHunt.cells.forEach(clearBug);
  const s = bugHunt.score;
  const stars = s >= 18 ? 3 : (s >= 11 ? 2 : 1);
  const record = s > (state.bestBugs || 0);
  if (record) state.bestBugs = s;
  $('bugsInfo').textContent = `${'⭐'.repeat(stars)} ${s} pts${record ? ' · record !' : ''}`;
  $('bugsMsg').textContent = stars === 3 ? 'Ça compile du premier coup ! 💚' : (stars === 2 ? 'Presque plus aucun bug 👌' : 'Il reste quelques bugs… 🐛');
  rewardGame({ id: 'bugs', activity: 'game_bugs', stars, happy: stars * 5, love: stars * 2, energy: -6, pers: 'geek', persPts: 3, label: 'à la Chasse aux bugs' });
  endGameLater(() => { bugsEl.hidden = true; }, 2600);
}

registerMini({ el: bugsEl, stop: () => { bugHunt.over = true; clearInterval(bugHunt.timer); } });
$('pickBugs').addEventListener('click', () => { gamesModal.hidden = true; if (!canAct()) return toast('Attends la fin de sa visite 😍'); startBugs(); });
