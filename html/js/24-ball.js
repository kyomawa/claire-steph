// =====================================================================
//  Ballon pour le compagnon
// =====================================================================
const ballEl = $('ball');
ballEl.src = A.toyBall;
const ball = { x: 30, y: 26, vx: 0, vy: 0, mode: 'rest', dragging: false, hist: [] };
let petFetch = null;
const BALL = 20;

function ballVisible() {
  return !!ITEM[state.wear.compagnon] && !game.active && himMode() !== 'sleep';
}

function placeBall() {
  ballEl.style.left = ball.x + 'px';
  ballEl.style.bottom = ball.y + 'px';
  ballEl.style.transform = `rotate(${(ball.x * 6) % 360}deg)`;
}

ballEl.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (!ballVisible()) return;
  ball.dragging = true;
  ball.mode = 'held';
  petFetch = null;
  ball.hist = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
  ball.moved = 0;
  try { ballEl.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
});
ballEl.addEventListener('pointermove', (e) => {
  if (!ball.dragging) return;
  const r = screenEl.getBoundingClientRect();
  const last = ball.hist[ball.hist.length - 1];
  ball.moved += Math.hypot(e.clientX - last.x, e.clientY - last.y);
  ball.hist.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  if (ball.hist.length > 6) ball.hist.shift();
  ball.x = Math.max(0, Math.min(r.width - BALL, e.clientX - r.left - BALL / 2));
  ball.y = Math.max(26, Math.min(r.height - BALL, r.bottom - e.clientY - BALL / 2));
  placeBall();
});
const releaseBall = (e) => {
  if (!ball.dragging) return;
  e.stopPropagation();
  ball.dragging = false;
  const h = ball.hist;
  if (ball.moved < 6) {
    // petite tape : on shoote
    ball.vx = (Math.random() < 0.5 ? -1 : 1) * rand(180, 300);
    ball.vy = rand(220, 320);
  } else {
    const a = h[0], b = h[h.length - 1];
    const dt = Math.max(0.016, (b.t - a.t) / 1000);
    ball.vx = Math.max(-700, Math.min(700, (b.x - a.x) / dt));
    ball.vy = Math.max(-200, Math.min(700, -(b.y - a.y) / dt));
  }
  ball.mode = 'fly';
  petFetch = 'chase';
  sfx.pop();
};
ballEl.addEventListener('pointerup', releaseBall);
ballEl.addEventListener('pointercancel', releaseBall);
ballEl.addEventListener('click', (e) => e.stopPropagation());

function syncBall(dt) {
  const show = ballVisible();
  ballEl.hidden = !show;
  if (!show) { petFetch = null; if (ball.mode === 'carried') ball.mode = 'rest'; return; }
  const W = screenEl.clientWidth, H = screenEl.clientHeight;
  if (ball.mode === 'fly') {
    ball.vy -= 950 * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x < 0) { ball.x = 0; ball.vx = -ball.vx * 0.6; }
    if (ball.x > W - BALL) { ball.x = W - BALL; ball.vx = -ball.vx * 0.6; }
    if (ball.y > H - BALL) { ball.y = H - BALL; ball.vy = -Math.abs(ball.vy) * 0.3; }
    if (ball.y <= 26) {
      ball.y = 26;
      if (Math.abs(ball.vy) > 90) { ball.vy = -ball.vy * 0.5; sfx.tap(); } else ball.vy = 0;
      ball.vx *= 0.82;
    }
    if (ball.y <= 26 && ball.vy === 0) {
      ball.vx *= Math.max(0, 1 - 3 * dt);
      if (Math.abs(ball.vx) < 10) { ball.vx = 0; ball.mode = 'rest'; }
    }
  }
  if (ball.mode === 'carried') {
    ball.x = petX + (petFace > 0 ? (petEl.offsetWidth || 30) - 10 : -6);
    ball.y = 26 + (petEl.offsetHeight || 34) * 0.45;
  }
  placeBall();
}

function petCaughtBall() {
  ball.mode = 'carried';
  petFetch = 'return';
  sfx.pop();
}

function petBroughtBall() {
  const it = ITEM[state.wear.compagnon];
  petFetch = null;
  ball.mode = 'rest';
  ball.y = 26;
  const before = snap();
  state.counters.fetches++;
  act('sport', 2);
  trainFor('fetches');
  state.happy = clamp(state.happy + 3);
  state.love = clamp(state.love + 1);
  if (it) showBubble(`${it.say} 🎾`, 1500, A[it.id]);
  spawnHeart(petX + 'px', '62px', 'icoHeart');
  sfx.happy();
  renderStats();
  showDeltas(before);
  checkTrophies();
}
