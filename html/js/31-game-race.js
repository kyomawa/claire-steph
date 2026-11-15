// =====================================================================
//  Mini-jeu : Course Gulf
// =====================================================================
const raceEl = $('race');
const raceCv = $('raceCanvas');
const rx = raceCv.getContext('2d');
const race = { on: false };

// Ce qui change selon le circuit, la météo et les pneus (Grand Prix)
function raceMods(circuit, weather, tire) {
  const t = (window.CheriCareer.TIRES[tire]) || { speed: 1 };
  const wet = weather === 'pluie';
  return {
    speed: (circuit ? circuit.speed : 1) * t.speed,
    grip: wet && tire !== 'pluie' ? 5 : 14,          // sous la pluie sans pneus pluie, ça glisse
    wet,
    night: !!(circuit && circuit.night),
    walls: !!(circuit && circuit.walls),
    busy: !!(circuit && circuit.busy)
  };
}

function startRace(opts) {
  if (!canAct()) return;
  beginGame();
  raceEl.hidden = false;
  const dpr = window.devicePixelRatio || 1;
  const W = screenEl.clientWidth, H = screenEl.clientHeight;
  raceCv.width = W * dpr;
  raceCv.height = H * dpr;
  rx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const o = opts || {};
  Object.assign(race, { on: true, W, H, lane: 1, carX: null, items: [], score: 0, lives: 3, t: 0, speed: 150, spawn: 0, road: 0, last: performance.now(), hit: 0, over: false,
    gp: o.gp || null, weather: o.weather || 'sec', tire: o.tire || 'durs', mod: o.gp ? raceMods(o.gp, o.weather, o.tire) : raceMods(null, 'sec', 'durs') });
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

// La voiture, avec ses améliorations du garage (aileron, pneus, échappement, numéro doré)
function drawCar(x, y, blink, ctx) {
  const c = ctx || rx;
  const car = state.car || {};
  const w = 30, h = 46;
  c.save();
  c.translate(x - w / 2, y - h / 2);
  if (blink) c.globalAlpha = 0.45;
  if ((car.moteur || 0) >= 2) {
    const f = 5 + car.moteur * 1.5 + Math.sin(performance.now() / 55) * 2.5;
    c.fillStyle = '#FFC233';
    c.beginPath(); c.moveTo(w / 2 - 5, h - 1); c.lineTo(w / 2 + 5, h - 1); c.lineTo(w / 2, h - 1 + f); c.closePath(); c.fill();
    c.fillStyle = '#F26A21';
    c.beginPath(); c.moveTo(w / 2 - 3, h - 1); c.lineTo(w / 2 + 3, h - 1); c.lineTo(w / 2, h - 1 + f * 0.6); c.closePath(); c.fill();
  }
  const ww = (car.pneus || 0) >= 3 ? 7 : 6;
  const wheels = [[-ww / 2, 6], [w - ww / 2, 6], [-ww / 2, h - 16], [w - ww / 2, h - 16]];
  c.fillStyle = '#111';
  wheels.forEach(([wx, wy]) => c.fillRect(wx, wy, ww, 11));
  if ((car.pneus || 0) >= 1) {
    c.fillStyle = '#F26A21';
    wheels.forEach(([wx, wy]) => c.fillRect(wx + ww / 2 - 1, wy + 1, 2, 9));
  }
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
  if ((car.aero || 0) >= 1) {
    c.fillStyle = '#1E3456';
    c.fillRect(-5, h - 4, w + 10, 4);
    c.fillStyle = '#F26A21';
    c.fillRect(-5, h - 4, 3, 4);
    c.fillRect(w + 2, h - 4, 3, 4);
  }
  if ((car.aero || 0) >= 3) { c.fillStyle = '#1E3456'; c.fillRect(-4, 0, w + 8, 3); }
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(w / 2, h - 15, 6, 0, Math.PI * 2); c.fill();
  if ((car.fiabilite || 0) >= 3) { c.strokeStyle = '#E8B923'; c.lineWidth = 2; c.stroke(); }
  c.fillStyle = '#1E3456';
  c.font = 'bold 9px "Space Mono", monospace';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(Math.min(99, levelFor(state.xp))), w / 2, h - 14.5);
  c.restore();
}

// Aperçu de la voiture dans le garage (de profil, vers la droite)
function drawCarPreview(cv) {
  const dpr = window.devicePixelRatio || 1;
  const W = Math.min(300, (cv.parentElement && cv.parentElement.clientWidth) || 260), H = 104;
  cv.width = W * dpr;
  cv.height = H * dpr;
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = '#3B4452';
  c.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 24) { c.fillStyle = (x / 24) % 2 ? '#F26A21' : '#A6D2EC'; c.fillRect(x, 0, 24, 6); c.fillRect(x, H - 6, 24, 6); }
  c.fillStyle = 'rgba(255,255,255,0.45)';
  for (let x = 6; x < W; x += 30) c.fillRect(x, H / 2 - 1.5, 16, 3);
  c.save();
  c.translate(W / 2, H / 2);
  c.rotate(Math.PI / 2);
  c.scale(1.6, 1.6);
  drawCar(0, 0, false, c);
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
    race.speed = (150 + race.t * 6) * race.mod.speed;
    race.road = (race.road + race.speed * dt) % 40;
    race.spawn -= dt;
    if (race.spawn <= 0) {
      race.spawn = Math.max(0.42, 0.95 - race.t * 0.015) * (race.mod.busy ? 0.82 : 1);
      const r = Math.random();
      const oil = race.mod.wet ? 0.66 : 0.6;     // flaques sous la pluie
      const k = r < 0.42 ? 'cone' : r < oil ? 'oil' : r < 0.9 ? 'fuel' : 'heart';
      race.items.push({ k, lane: Math.floor(Math.random() * 3), y: -20, x: 0 });
    }
  }
  // route (murs gris à Monaco, piste plus sombre sous la pluie)
  const m = race.mod;
  rx.fillStyle = m.wet ? '#2E3542' : '#3B4452'; rx.fillRect(0, 0, W, H);
  rx.fillStyle = m.walls ? '#8E98A5' : (m.wet ? '#4C7A41' : '#5E8F4E'); rx.fillRect(0, 0, W * 0.12, H); rx.fillRect(W * 0.88, 0, W * 0.12, H);
  const kerbA = m.walls ? '#D9373B' : '#F26A21', kerbB = m.walls ? '#FFFFFF' : '#A6D2EC';
  for (let y = -40 + race.road; y < H; y += 40) {
    rx.fillStyle = (Math.round((y - race.road) / 40) % 2) ? kerbA : kerbB;
    rx.fillRect(W * 0.12, y, 8, 20); rx.fillRect(W * 0.88 - 8, y, 8, 20);
    rx.fillStyle = (Math.round((y - race.road) / 40) % 2) ? kerbB : kerbA;
    rx.fillRect(W * 0.12, y + 20, 8, 20); rx.fillRect(W * 0.88 - 8, y + 20, 8, 20);
    rx.fillStyle = 'rgba(255,255,255,0.55)';
    rx.fillRect(laneX(0) + (laneX(1) - laneX(0)) / 2 - 1.5, y + 6, 3, 18);
    rx.fillRect(laneX(1) + (laneX(2) - laneX(1)) / 2 - 1.5, y + 6, 3, 18);
  }
  // voiture
  const target = laneX(race.lane);
  race.carX = race.carX === null ? target : race.carX + (target - race.carX) * Math.min(1, dt * race.mod.grip);
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
  if (m.wet) {
    rx.strokeStyle = 'rgba(200, 225, 245, 0.55)';
    rx.lineWidth = 1.2;
    rx.beginPath();
    for (let i = 0; i < 26; i++) {
      const px = (i * 53 + ts * 0.03) % W, py = (i * 97 + ts * 0.9) % H;
      rx.moveTo(px, py); rx.lineTo(px - 4, py + 11);
    }
    rx.stroke();
  }
  if (m.night) {
    // la nuit : tout est sombre sauf le faisceau des phares
    rx.save();
    rx.beginPath();
    rx.rect(0, 0, W, H);
    rx.moveTo(race.carX - 12, carY - 22);
    rx.lineTo(race.carX - 72, carY - 190);
    rx.lineTo(race.carX + 72, carY - 190);
    rx.lineTo(race.carX + 12, carY - 22);
    rx.closePath();
    rx.fillStyle = 'rgba(8, 12, 30, 0.62)';
    rx.fill('evenodd');
    rx.restore();
  }
  // sa voiture reste bien visible, même la nuit
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
    const tire = race.gp && window.CheriCareer.TIRES[race.tire];
    rx.fillText(race.gp ? `${race.weather === 'pluie' ? '☔ Pluie' : '☀️ Sec'} · pneus ${tire ? tire.name.toLowerCase() : ''}${race.mod.night ? ' · de nuit' : ''}` : 'Évite les plots, ramasse les ⛽ 💕', W / 2, H / 2 + 8);
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
  endGameLater(() => {
    race.on = false;
    cancelAnimationFrame(race.raf);
    raceEl.hidden = true;
  }, 2400);
}
$('pickRace').addEventListener('click', () => { gamesModal.hidden = true; if (!canAct()) return toast('Attends la fin de sa visite 😍'); startRace(); });
