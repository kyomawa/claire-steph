// =====================================================================
//  Mini-jeu : attrape les bisous
// =====================================================================
const game = { active: false, running: false };
const gameEl = $('game');
const catcherEl = $('gameCatcher');
const gameIntro = $('gameIntro');
const GAME_ITEMS = [
  { e: '💋', v: 1, w: 4 }, { e: '☕', v: 1, w: 3 }, { e: '💕', v: 2, w: 2 }, { e: '🐛', v: -2, w: 2 }
];
const GAME_TIME = 20;
const CATCHER_W = 44;

function pickItem() {
  const total = GAME_ITEMS.reduce((s, i) => s + i.w, 0);
  let r = Math.random() * total;
  for (const i of GAME_ITEMS) { r -= i.w; if (r <= 0) return i; }
  return GAME_ITEMS[0];
}

function setIntro(lines) {
  gameIntro.replaceChildren(...lines.map(([text, cls]) => {
    const d = document.createElement('div');
    d.textContent = text;
    if (cls) d.className = cls;
    return d;
  }));
  gameIntro.hidden = false;
}

function startCatchGame() {
  if (!canAct()) return;
  beginGame();

  game.score = 0;
  game.items = [];
  game.time = GAME_TIME;
  game.elapsed = 0;
  game.spawnAcc = 0;
  game.frameAcc = 0;
  game.x = game.targetX = (screenEl.clientWidth - CATCHER_W) / 2;
  catcherEl.src = A.himStand;
  game.jumpUntil = 0;
  catcherEl.style.left = game.x + 'px';
  $('gameScore').textContent = '💋 0';
  $('gameTime').textContent = '⏱ ' + GAME_TIME;
  gameEl.classList.add('show');

  setIntro([['💋 ☕ 💕', 'big'], ['Attrape les bisous et les cafés,'], ['évite les bugs 🐛 !'], ['Glisse le doigt pour bouger']]);
  let count = 3;
  setTimeout(function countdown() {
    if (count > 0) { setIntro([[String(count), 'big']]); count--; setTimeout(countdown, 600); return; }
    gameIntro.hidden = true;
    game.running = true;
    game.last = performance.now();
    requestAnimationFrame(gameLoop);
  }, 1800);
}

function moveTarget(clientX) {
  const rect = screenEl.getBoundingClientRect();
  game.targetX = Math.max(0, Math.min(rect.width - CATCHER_W, clientX - rect.left - CATCHER_W / 2));
}
gameEl.addEventListener('pointerdown', (e) => { if (game.running) moveTarget(e.clientX); });
gameEl.addEventListener('pointermove', (e) => { if (game.running) moveTarget(e.clientX); });
document.addEventListener('keydown', (e) => {
  if (!game.running) return;
  const w = screenEl.clientWidth - CATCHER_W;
  if (e.key === 'ArrowLeft') { game.targetX = Math.max(0, game.targetX - 36); e.preventDefault(); }
  if (e.key === 'ArrowRight') { game.targetX = Math.min(w, game.targetX + 36); e.preventDefault(); }
});

function gameLoop(ts) {
  if (!game.running) return;
  const dt = Math.min(0.05, (ts - game.last) / 1000);
  game.last = ts;
  game.elapsed += dt;
  game.time -= dt;
  const W = screenEl.clientWidth, H = screenEl.clientHeight;

  // apparition
  game.spawnAcc += dt;
  const every = Math.max(0.33, 0.75 - game.elapsed * 0.02);
  if (game.spawnAcc >= every) {
    game.spawnAcc = 0;
    const type = pickItem();
    const el = document.createElement('div');
    el.className = 'game-item';
    el.textContent = type.e;
    gameEl.appendChild(el);
    game.items.push({ el, type, x: rand(6, W - 30), y: -26, vy: rand(70, 110) + game.elapsed * 4 });
  }

  // déplacement du receveur
  const prevX = game.x;
  game.x += (game.targetX - game.x) * Math.min(1, dt * 12);
  catcherEl.style.left = game.x + 'px';
  if (Math.abs(game.x - prevX) > 0.3) {
    catcherEl.style.transform = game.x > prevX ? 'scaleX(1)' : 'scaleX(-1)';
    game.frameAcc += dt;
    if (game.frameAcc > 0.15 && ts > game.jumpUntil) {
      game.frameAcc = 0;
      catcherEl.src = catcherEl.getAttribute('src') === A.himWalk ? A.himStand : A.himWalk;
    }
  }

  // chute + collisions
  const catchTop = H - 8 - catcherEl.clientHeight * 0.8;
  for (let i = game.items.length - 1; i >= 0; i--) {
    const it = game.items[i];
    it.y += it.vy * dt;
    it.el.style.transform = `translate(${it.x}px, ${it.y}px)`;
    const cx = it.x + 11;
    const caught = it.y + 22 >= catchTop && it.y < H - 10 && cx >= game.x - 6 && cx <= game.x + CATCHER_W + 6;
    if (caught) {
      game.score = Math.max(0, game.score + it.type.v);
      if (it.type.v > 0) { catcherEl.src = A.himJump; game.jumpUntil = ts + 220; sfx.tap(); } else { sfx.bad(); buzz(30); }
      spawnHeart(it.x + 'px', (H - it.y - 10) + 'px', it.type.v > 0 ? `+${it.type.v}` : '🐛 -2');
    }
    if (caught || it.y > H) { it.el.remove(); game.items.splice(i, 1); }
  }

  $('gameScore').textContent = '💋 ' + game.score;
  $('gameTime').textContent = '⏱ ' + Math.max(0, Math.ceil(game.time));
  if (game.time <= 0) return endGame();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  game.running = false;
  game.items.forEach((it) => it.el.remove());
  game.items = [];
  const s = game.score;
  const record = s > state.bestScore;
  if (record) state.bestScore = s;
  setIntro([
    [record && s > 0 ? '🏅' : '🎮', 'big'],
    [`Score : ${s} ${record && s > 0 ? '— nouveau record !' : ''}`],
    [`Record : ${state.bestScore}`]
  ]);
  state.happy = clamp(state.happy + Math.min(30, s * 2));
  state.love = clamp(state.love + Math.min(15, s));
  state.energy = clamp(state.energy - 10);
  state.hunger = clamp(state.hunger - 8);
  state.counters.games++;
  const mult = playMult('catch');
  trainFor('game_catch', mult);
  act('geek', 2);
  gainXp(Math.round(Math.max(2, s) * mult));
  earn(Math.round(Math.floor(s / 2) * mult) + geekBonus(), 'au mini-jeu');
  updateConditions(true);
  renderStats();
  checkTrophies();

  endGameLater(() => {
    gameEl.classList.remove('show');
    gameIntro.hidden = true;
  }, 2400);
}
