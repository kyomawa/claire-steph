// =====================================================================
//  Mini-jeu : Course Gulf
// =====================================================================
const raceEl = $('race');
const raceCv = $('raceCanvas');
const rx = raceCv.getContext('2d');
const race = { on: false };

function startRace() {
  if (!canAct()) return;
  busy = true;
  game.active = true;
  stopHim();
  bubbleEl.classList.remove('show');
  spriteEl.style.visibility = 'hidden';
  afterCare();
  raceEl.hidden = false;
  const dpr = window.devicePixelRatio || 1;
  const W = screenEl.clientWidth, H = screenEl.clientHeight;
  raceCv.width = W * dpr;
  raceCv.height = H * dpr;
  rx.setTransform(dpr, 0, 0, dpr, 0, 0);
  Object.assign(race, { on: true, W, H, lane: 1, carX: null, items: [], score: 0, lives: 3, t: 0, speed: 150, spawn: 0, road: 0, last: performance.now(), hit: 0, over: false, gp: null });
  race.raf = requestAnimationFrame(raceLoop);
}

const laneX = (i) => {
  const left = race.W * 0.16, right = race.W * 0.84;
  return left + ((right - left) / 3) * (i + 0.5);
};

function raceInput(dir) {
  if (!race.on || race.over) return;
  race.lane = Math.max(0, Math.min(2, race.lane + dir));
  sfx.tap();
}
raceEl.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  const r = raceEl.getBoundingClientRect();
  raceInput(e.clientX - r.left < r.width / 2 ? -1 : 1);
});
document.addEventListener('keydown', (e) => {
  if (!race.on) return;
  if (e.key === 'ArrowLeft') { raceInput(-1); e.preventDefault(); }
  if (e.key === 'ArrowRight') { raceInput(1); e.preventDefault(); }
});

function drawCar(x, y, blink) {
  const c = rx;
  const w = 30, h = 46;
  c.save();
  c.translate(x - w / 2, y - h / 2);
  if (blink) c.globalAlpha = 0.45;
  c.fillStyle = '#111';
  [[-3, 6], [w - 3, 6], [-3, h - 16], [w - 3, h - 16]].forEach(([wx, wy]) => c.fillRect(wx, wy, 6, 11));
  c.fillStyle = '#1E3456';
  c.fillRect(0, 2, w, h - 2);
  c.fillStyle = '#A6D2EC';
  c.fillRect(2, 3, w - 4, h - 5);
  c.fillStyle = '#1E3456';
  c.fillRect(w / 2 - 7, 3, 2, h - 5);
  c.fillRect(w / 2 + 5, 3, 2, h - 5);
  c.fillStyle = '#F26A21';
  c.fillRect(w / 2 - 5, 3, 10, h - 5);
  c.fillStyle = '#1E3456';
  c.fillRect(5, 9, w - 10, 7);
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(w / 2, h - 15, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#1E3456';
  c.font = 'bold 9px "Space Mono", monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(Math.min(99, levelFor(state.xp))), w / 2, h - 14.5);
  c.restore();
}

function drawItem(it) {
  const c = rx;
  if (it.k === 'cone') {
    c.fillStyle = '#F26A21';
    c.beginPath(); c.moveTo(it.x, it.y - 12); c.lineTo(it.x - 10, it.y + 10); c.lineTo(it.x + 10, it.y + 10); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.fillRect(it.x - 6, it.y, 12, 3);
    c.fillStyle = '#1E3456'; c.fillRect(it.x - 12, it.y + 9, 24, 3);
  } else if (it.k === 'oil') {
    c.fillStyle = 'rgba(20,20,30,0.85)';
    c.beginPath(); c.ellipse(it.x, it.y, 14, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(166,210,236,0.35)'; c.beginPath(); c.ellipse(it.x - 4, it.y - 2, 4, 2, 0, 0, Math.PI * 2); c.fill();
  } else {
    c.font = '20px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(it.k === 'fuel' ? '⛽' : '💕', it.x, it.y);
  }
}

function raceLoop(ts) {
  if (!race.on) return;
  const dt = Math.min(0.05, (ts - race.last) / 1000);
  race.last = ts;
  const { W, H } = race;
  if (!race.over) {
    race.t += dt;
    race.speed = 150 + race.t * 6;
    race.road = (race.road + race.speed * dt) % 40;
    race.spawn -= dt;
    if (race.spawn <= 0) {
      race.spawn = Math.max(0.42, 0.95 - race.t * 0.015);
      const r = Math.random();
      const k = r < 0.42 ? 'cone' : r < 0.6 ? 'oil' : r < 0.9 ? 'fuel' : 'heart';
      race.items.push({ k, lane: Math.floor(Math.random() * 3), y: -20, x: 0 });
    }
  }
  // route
  rx.fillStyle = '#3B4452'; rx.fillRect(0, 0, W, H);
  rx.fillStyle = '#5E8F4E'; rx.fillRect(0, 0, W * 0.12, H); rx.fillRect(W * 0.88, 0, W * 0.12, H);
  for (let y = -40 + race.road; y < H; y += 40) {
    rx.fillStyle = (Math.round((y - race.road) / 40) % 2) ? '#F26A21' : '#A6D2EC';
    rx.fillRect(W * 0.12, y, 8, 20); rx.fillRect(W * 0.88 - 8, y, 8, 20);
    rx.fillStyle = (Math.round((y - race.road) / 40) % 2) ? '#A6D2EC' : '#F26A21';
    rx.fillRect(W * 0.12, y + 20, 8, 20); rx.fillRect(W * 0.88 - 8, y + 20, 8, 20);
    rx.fillStyle = 'rgba(255,255,255,0.55)';
    rx.fillRect(laneX(0) + (laneX(1) - laneX(0)) / 2 - 1.5, y + 6, 3, 18);
    rx.fillRect(laneX(1) + (laneX(2) - laneX(1)) / 2 - 1.5, y + 6, 3, 18);
  }
  // voiture
  const target = laneX(race.lane);
  race.carX = race.carX === null ? target : race.carX + (target - race.carX) * Math.min(1, dt * 14);
  const carY = H - 40;
  // objets
  for (let i = race.items.length - 1; i >= 0; i--) {
    const it = race.items[i];
    if (!race.over) it.y += race.speed * dt;
    it.x = laneX(it.lane);
    drawItem(it);
    const near = Math.abs(it.x - race.carX) < 18 && Math.abs(it.y - carY) < 26;
    if (near && !race.over) {
      race.items.splice(i, 1);
      if (it.k === 'fuel') { race.score += 1; sfx.tap(); }
      else if (it.k === 'heart') { race.score += 2; sfx.coin(); }
      else if (ts > race.hit) { race.lives--; race.hit = ts + 1200; sfx.bad(); buzz(60); }
      continue;
    }
    if (it.y > H + 30) race.items.splice(i, 1);
  }
  drawCar(race.carX, carY, ts < race.hit && Math.floor(ts / 120) % 2 === 0);
  // tableau de bord
  rx.fillStyle = 'rgba(30,52,86,0.85)';
  rx.fillRect(6, 6, 140, 22);
  rx.fillStyle = '#fff';
  rx.font = 'bold 12px "Space Mono", monospace';
  rx.textAlign = 'left';
  rx.textBaseline = 'middle';
  rx.fillText(`⛽ ${race.score}  ${'❤️'.repeat(Math.max(0, race.lives))}`, 12, 17);
  if (race.t < 2.2 && !race.over) {
    rx.fillStyle = 'rgba(255,255,255,0.92)';
    rx.fillRect(W / 2 - 120, H / 2 - 30, 240, 52);
    rx.fillStyle = '#1E3456';
    rx.textAlign = 'center';
    rx.font = 'bold 13px "Baloo 2", sans-serif';
    rx.fillText(race.gp ? `Grand Prix de ${race.gp.name} ${race.gp.flag}` : 'Tape à gauche / à droite', W / 2, H / 2 - 12);
    rx.fillText('Évite les plots, ramasse les ⛽ 💕', W / 2, H / 2 + 8);
  }
  if (!race.over && (race.lives <= 0 || race.t >= 40)) endRace();
  if (race.over) {
    rx.fillStyle = 'rgba(255,255,255,0.92)';
    rx.fillRect(W / 2 - 110, H / 2 - 32, 220, 60);
    rx.fillStyle = '#1E3456';
    rx.textAlign = 'center';
    rx.font = 'bold 15px "Baloo 2", sans-serif';
    rx.fillText(race.result, W / 2, H / 2 - 10);
    rx.font = '12px "Space Mono", monospace';
    rx.fillText(race.result2, W / 2, H / 2 + 12);
  }
  race.raf = requestAnimationFrame(raceLoop);
}

function endRace() {
  if (race.gp) return endGP();
  race.over = true;
  const s = race.score;
  const stars = s >= 25 ? 3 : (s >= 14 ? 2 : 1);
  const record = s > (state.bestRace || 0);
  if (record) state.bestRace = s;
  race.result = `${'⭐'.repeat(stars)} ${s} pts${race.lives <= 0 ? ' · sortie de piste !' : ''}`;
  race.result2 = record ? 'Nouveau record 🏁' : `Record : ${state.bestRace}`;
  const before = snap();
  state.happy = clamp(state.happy + stars * 6);
  state.love = clamp(state.love + stars * 2);
  state.energy = clamp(state.energy - 6);
  state.counters.games++;
  state.counters.races++;
  sfx.level();
  const mult = playMult('race');
  trainFor('game_race', mult);
  act('geek', 3);
  gainXp(Math.round((4 + stars * 3) * mult));
  earn(Math.round((Math.floor(s / 2) + stars) * mult) + geekBonus(), 'à la Course');
  updateConditions(true);
  renderStats();
  showDeltas(before);
  checkTrophies();
  setTimeout(() => {
    race.on = false;
    cancelAnimationFrame(race.raf);
    raceEl.hidden = true;
    spriteEl.style.visibility = '';
    game.active = false;
    busy = false;
    refreshHim(true);
  }, 2400);
}
$('pickRace').addEventListener('click', () => { gamesModal.hidden = true; if (!canAct()) return toast('Attends la fin de sa visite 😍'); startRace(); });
