// =====================================================================
//  Mini-jeu : Danse avec elle (rythme)
// =====================================================================
const danceEl = $('dance');
const DANCE_BEAT = 560;
const DANCE_PATTERN = [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1];
const dance = { notes: [], start: 0, score: 0, beat: -1, raf: 0, combo: 0 };

function startDance() {
  if (!canAct()) return;
  busy = true;
  game.active = true;
  stopHim();
  bubbleEl.classList.remove('show');
  spriteEl.style.visibility = 'hidden';
  afterCare();
  $('danceHim').src = A.himStand;
  $('danceHer').src = A.herStand;
  $('danceMsg').textContent = 'Tape quand le cercle touche le rond !';
  $('danceInfo').textContent = '🪩 0 pt';
  danceEl.hidden = false;
  dance.start = performance.now() + 2000;
  dance.notes = [];
  DANCE_PATTERN.forEach((on, i) => { if (on) dance.notes.push({ t: dance.start + (i + 2) * DANCE_BEAT, judged: false }); });
  dance.end = dance.start + (DANCE_PATTERN.length + 3) * DANCE_BEAT;
  dance.score = 0;
  dance.combo = 0;
  dance.beat = -1;
  cancelAnimationFrame(dance.raf);
  dance.raf = requestAnimationFrame(danceLoop);
}

function judge(text, cls) {
  const m = $('danceMsg');
  m.textContent = text;
  m.className = 'dance-msg ' + cls;
}

function danceTap(e) {
  if (e) e.stopPropagation();
  if (danceEl.hidden) return;
  const now = performance.now();
  let best = null;
  for (const n of dance.notes) if (!n.judged && (!best || Math.abs(n.t - now) < Math.abs(best.t - now))) best = n;
  if (!best || Math.abs(best.t - now) > 300) return;
  best.judged = true;
  const d = Math.abs(best.t - now);
  const melody = [523, 587, 659, 784, 880, 784, 659, 587];
  if (d < 110) { dance.score += 2; dance.combo++; judge(dance.combo > 2 ? `Parfait ! x${dance.combo} 🔥` : 'Parfait ! 💃', 'perfect'); }
  else if (d < 230) { dance.score += 1; dance.combo++; judge('Bien ! 🕺', 'good'); }
  else { dance.combo = 0; judge('Raté 😜', 'miss'); sfx.bad(); return; }
  tonePlay(melody[dance.notes.indexOf(best) % melody.length]);
  $('danceInfo').textContent = `🪩 ${dance.score} pts`;
}
function tonePlay(freq) {
  // petite note de mélodie quand on tape juste
  if (state.sound === false) return;
  try {
    const ctx = tonePlay.ctx || (tonePlay.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.2);
  } catch (err) { /* pas de son */ }
}
danceEl.addEventListener('pointerdown', danceTap);
document.addEventListener('keydown', (e) => { if (!danceEl.hidden && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); danceTap(); } });

function danceLoop(now) {
  if (danceEl.hidden) return;
  const beat = Math.floor((now - dance.start) / DANCE_BEAT);
  if (beat !== dance.beat && now >= dance.start) {
    dance.beat = beat;
    const up = beat % 2 === 0;
    $('danceHim').src = up ? A.himJump : A.himStand;
    $('danceHer').src = up ? A.herStand : A.herJump;
    $('danceHim').style.transform = beat % 4 < 2 ? 'scaleX(1)' : 'scaleX(-1)';
    $('danceHer').style.transform = beat % 4 < 2 ? 'scaleX(-1)' : 'scaleX(1)';
    if (state.sound !== false) tonePlayKick();
  }
  // anneau du prochain temps
  const next = dance.notes.find((n) => !n.judged && n.t > now - 230);
  const ring = $('danceRing');
  if (next) {
    const lead = next.t - now;
    const sc = Math.max(1, 1 + (lead / (2 * DANCE_BEAT)) * 1.4);
    ring.style.transform = `scale(${sc})`;
    ring.style.opacity = lead < 2 * DANCE_BEAT ? '1' : '0';
  } else ring.style.opacity = '0';
  for (const n of dance.notes) if (!n.judged && now - n.t > 230) { n.judged = true; dance.combo = 0; judge('Raté 😜', 'miss'); }
  if (now > dance.end) return endDance();
  dance.raf = requestAnimationFrame(danceLoop);
}
function tonePlayKick() {
  try {
    const ctx = tonePlay.ctx || (tonePlay.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.16);
  } catch (err) { /* pas de son */ }
}

function endDance() {
  const max = dance.notes.length * 2;
  const pct = dance.score / max;
  const stars = pct >= 0.8 ? 3 : (pct >= 0.5 ? 2 : 1);
  const record = dance.score > (state.bestDance || 0);
  if (record) state.bestDance = dance.score;
  state.bestDanceStars = Math.max(state.bestDanceStars || 0, stars);
  judge(`${'⭐'.repeat(stars)} ${dance.score} / ${max} pts${record ? ' · record !' : ''}`, 'perfect');
  const before = snap();
  state.happy = clamp(state.happy + stars * 6);
  state.love = clamp(state.love + stars * 4);
  state.energy = clamp(state.energy - 8);
  state.hunger = clamp(state.hunger - 4);
  state.counters.games++;
  sfx.level();
  gainXp(4 + stars * 3);
  earn(stars * 4, 'à la Danse');
  updateConditions(true);
  renderStats();
  showDeltas(before);
  checkTrophies();
  setTimeout(() => {
    danceEl.hidden = true;
    spriteEl.style.visibility = '';
    game.active = false;
    busy = false;
    refreshHim(true);
  }, 2300);
}

$('pickMemory').addEventListener('click', () => { gamesModal.hidden = true; if (!canAct()) return toast('Attends la fin de sa visite 😍'); startMemory(); });
$('pickDance').addEventListener('click', () => { gamesModal.hidden = true; if (!canAct()) return toast('Attends la fin de sa visite 😍'); startDance(); });
