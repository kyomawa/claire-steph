// =====================================================================
//  Actions
// =====================================================================
const actionVisual = $('actionVisual');
const actionImg = $('actionImg');
const actionEmoji = $('actionEmoji');
const actionCaption = $('actionCaption');

function canAct() { return !busy && !girlBusy && !game.active; }

function afterCare() {
  if (isNight()) {
    if (himMode() === 'sleep' || state.awakeUntil > Date.now()) state.awakeUntil = Date.now() + 60 * 1000;   // il se recouche au bout d'une minute
    const h = now().getHours();
    if (h >= 0 && h < 5) unlock('night_owl');
  }
}

const COUNTER_CAT = { meals: 'food', runs: 'sport', codes: 'geek', moments: 'love' };

function doAction({ img, emoji, caption, delta, duration, xp, counter, after, scene, weight, cat, pts }) {
  if (!canAct()) return;
  busy = true;
  stopHim();
  bubbleEl.classList.remove('show');

  if (img) {
    actionImg.src = img; actionImg.hidden = false; actionEmoji.hidden = true;
    actionImg.classList.toggle('scene', !!scene);
  } else {
    actionImg.hidden = true; actionEmoji.textContent = emoji || '✨'; actionEmoji.hidden = false;
  }
  actionCaption.textContent = caption;
  actionVisual.classList.add('show');
  const before = snap();
  if (counter === 'meals') sfx.eat(); else sfx.happy();

  state.hunger = clamp(state.hunger + (delta.hunger || 0));
  state.energy = clamp(state.energy + (delta.energy || 0));
  state.happy = clamp(state.happy + (delta.happy || 0));
  state.love = clamp(state.love + (delta.love || 0));
  if (counter) state.counters[counter]++;
  if (counter === 'meals') Sim.eat(state, Date.now(), weight ?? 0.3);
  else if (weight) state.weight = Math.max(45, Math.min(110, state.weight + weight));
  const c = cat || COUNTER_CAT[counter];
  if (c) act(c, pts || 4);
  if (typeof trainFor === 'function') {
    if (counter === 'moments') trainFor('moment_' + ({ food: 'cuisine', sport: 'sport', party: 'party' }[c] || 'love'));
    else if (counter) trainFor(counter);
  }
  afterCare();
  if (after) after();
  gainXp(xp || 0);
  updateConditions(true);
  renderStats();
  showDeltas(before);
  checkTrophies();

  setTimeout(() => {
    actionVisual.classList.remove('show');
    busy = false;
    refreshHim(true);
    renderStats();
  }, duration || 1600);
}

function refuse(text) {
  if (!canAct()) return;
  sfx.bad();
  showBubble(text, 2200);
}

$('btnCoffee').addEventListener('click', () => {
  if (!canAct()) return;
  renderFood();
  foodModal.hidden = false;
});

$('btnRun').addEventListener('click', () => {
  if (state.sick) return refuse('Trop malade pour courir... 🤒');
  if (state.energy < 10) return refuse('Trop crevé pour courir 😮‍💨');
  doAction({
    img: A.runningBig, caption: 'Ça défoule, un petit run ! 🏃',
    delta: { energy: -12, happy: isPers('sport') ? 33 : 22, hunger: -14 }, duration: 1600, xp: 5, counter: 'runs', weight: -0.5
  });
});

const CODE_RESULTS = [
  { caption: 'Encore un bug à corriger... 💻', delta: { energy: -12, happy: -4, hunger: -6 } },
  { caption: 'Ça compile du premier coup ?! 😲', delta: { energy: -10, happy: 12, hunger: -6 } },
  { caption: 'Mise en prod un vendredi... 😱', delta: { energy: -14, happy: -8, hunger: -8 } },
  { caption: 'Tous les tests sont verts ✅', delta: { energy: -10, happy: 10, hunger: -6 } }
];
$('btnCode').addEventListener('click', () => {
  if (state.sick) return refuse('Pas de code au lit, docteur 🤒');
  doAction({ img: A.laptopBig, ...pick(CODE_RESULTS), duration: 1600, xp: 5, counter: 'codes' });
});

$('btnSleep').addEventListener('click', () => {
  if (!canAct()) return;
  // il dort : le bouton sert d'interrupteur
  if (himMode() === 'sleep') return toggleLights();
  const night = isNight() || now().getHours() >= 21;   // dès 21 h : on le couche
  doAction({
    img: night ? sceneOf('nuit') : A.sleepBig, scene: night, caption: night ? 'Au lit ! Lumière éteinte 🌙💤' : 'Petite sieste… Zzz 💤',
    delta: { energy: night ? 10 : 32, happy: 6, hunger: -4, love: night ? 6 : 0 }, duration: night ? 2600 : 2000, xp: 2, counter: 'sleeps',
    after: () => {
      state.awakeUntil = 0;
      if (night) { state.lights = false; addToAlbum('nuit'); }
    }
  });
});

$('btnHeal').addEventListener('click', () => {
  if (!state.sick) return refuse('Il pète la forme, pas besoin 💪');
  if (state.discipline < 30 && Math.random() < 1 / 3) return refuse('Pas envie du médicament ! 😝 (un peu de sagesse l’aiderait)');
  doAction({
    img: sceneOf('soins'), scene: true, caption: 'Une tisane, un plaid, et je veille sur toi 🍵',
    delta: { energy: 10, happy: 12, love: 6, hunger: 10 }, duration: 2200, xp: 4, counter: 'heals',
    after: () => {
      state.sick = false;
      state.hunger = Math.max(state.hunger, 20);
      addToAlbum('soins');
      setTimeout(() => showBubble('Merci, ça va mieux 🥹', 2200), 2300);
    }
  });
});

$('btnWash').addEventListener('click', () => {
  const n = state.poops.length;
  doAction({
    img: A.himWash, caption: n ? 'Grand ménage et petite douche 🧼' : 'Petite douche, tout propre 🫧',
    delta: { happy: 8 + n * 4, energy: 4 }, duration: 1800, xp: 2 + n, counter: 'washes',
    after: () => { state.counters.cleaned += n; state.poops = []; renderPoops(); }
  });
});

// ---- Toucher : bisou (tap), chatouilles (3 taps), caresse (frotter) ----
let rub = null;
let suppressClick = false;
let tapTimes = [];

function stroke() {
  const mode = himMode();
  state.counters.strokes++;
  act('love', 0.4);
  sfx.purr();
  buzz(8);
  if (mode === 'normal') {
    state.happy = clamp(state.happy + 1.5);
    state.love = clamp(state.love + 1);
    if (state.counters.strokes % 4 === 0) {
      showBubble(pick(['Mmmh, encore 😌', 'Trop bien 🥰', 'Ronron… 😽', 'Juste là, oui 😍']), 1400);
      flashMood(A.himHappy, 1400);
    }
  } else if (mode === 'sulk') {
    state.love = clamp(state.love + 2.5);
    if (state.counters.strokes % 3 === 0) showBubble(pick(['Hmpf… 😳', 'Bon… peut-être 🙄', 'Continue… 😶']), 1300);
  } else if (mode === 'sick') {
    state.happy = clamp(state.happy + 1);
    if (state.counters.strokes % 4 === 0) showBubble('Ça fait du bien… 🥺', 1400);
  } else if (mode === 'sleep') {
    state.love = clamp(state.love + 0.5);
    if (state.counters.strokes % 5 === 0) showBubble('*sourit en dormant* 😴', 1400);
  }
  spawnHeart((spriteEl.offsetLeft + rand(0, spriteEl.offsetWidth - 16)) + 'px', rand(60, 95) + 'px', pick(['💗', '💕', 'icoHeart']));
  if (state.counters.strokes % 3 === 0) gainXp(1);
  updateConditions();
  renderStats();
  checkTrophies();
}

spriteEl.addEventListener('pointerdown', (e) => {
  if (!canAct()) return;
  rub = { x: e.clientX, y: e.clientY, dist: 0, beats: 0, long: false };
  const mine = rub;
  rub.timer = setTimeout(() => { if (rub === mine && mine.dist < 12) { mine.long = true; cuddle(); } }, 650);
  try { spriteEl.setPointerCapture(e.pointerId); } catch (err) { /* ignoré */ }
});
spriteEl.addEventListener('pointermove', (e) => {
  if (!rub) return;
  rub.dist += Math.hypot(e.clientX - rub.x, e.clientY - rub.y);
  rub.x = e.clientX; rub.y = e.clientY;
  if (rub.dist > 20 && currentMode && currentMode.startsWith('normal')) {
    if (Date.now() >= pauseUntil) setPose(A.himStand, null);
    pauseUntil = Date.now() + 700;
  }
  while (rub.dist - rub.beats * 70 > 70) { rub.beats++; stroke(); }
});
const endRub = () => {
  if (rub) { clearTimeout(rub.timer); suppressClick = rub.dist > 20 || rub.long; }
  rub = null;
};
spriteEl.addEventListener('pointerup', endRub);
spriteEl.addEventListener('pointercancel', endRub);
spriteEl.style.touchAction = 'none';

function tickle() {
  tapTimes = [];
  sfx.giggle();
  squash();
  buzz([20, 40, 20]);
  state.counters.tickles++;
  act('party', 0.8);
  state.happy = clamp(state.happy + 6);
  gainXp(2);
  strikePose(A.himJump, 'pose-jump', 900);
  showBubble(pick(['Ha ha ! Arrête ! 😂', 'Pas les chatouilles ! 🤣', 'Hihihi 😆', 'Au secours 😂😂']), 1600);
  flashMood(A.himHappy, 1500);
  ['😂', '✨', '😆'].forEach((e, i) => setTimeout(() => spawnHeart((spriteEl.offsetLeft + 10 + i * 14) + 'px', '90px', e), i * 120));
  renderStats();
  checkTrophies();
}

spriteEl.addEventListener('click', (e) => {
  e.stopPropagation();
  if (suppressClick) { suppressClick = false; return; }
  if (!canAct()) {
    if (girlBusy) spawnHeart((spriteEl.offsetLeft + 20) + 'px', '90px', '😍');
    return;
  }
  const mode = himMode();
  if (mode === 'sleep') {
    state.awakeUntil = Date.now() + 60 * 1000;
    showBubble("Hein ?! J'dormais... 😪", 2000);
    setTimeout(() => flashMood(A.himSurprised, 1800), 0);
    refreshHim(true);
    renderStats();
    return;
  }
  if (mode === 'sick') return showBubble(pick(['Atchoum ! 🤧', 'Soigne-moi... 🥺', "J'ai froid... 🥶"]), 1600);
  if (mode === 'sulk') {
    state.love = clamp(state.love + 1);
    renderStats();
    return showBubble(pick(['Hmpf. 😤', '...', "Je t'entends pas 🙉", 'Essaie plutôt un câlin 🙄']), 1400);
  }
  const t = Date.now();
  tapTimes = tapTimes.filter((x) => t - x < 900);
  tapTimes.push(t);
  if (tapTimes.length >= 3) return tickle();
  state.happy = clamp(state.happy + 4);
  state.counters.kisses++;
  act('love', 0.3);
  sfx.kiss();
  buzz(15);
  gainXp(1);
  renderStats();
  checkTrophies();
  flashMood(A.himHappy, 900);
  squash();
  spawnHeart(spriteEl.style.left, '80px', pick(['💙', 'icoHeart', '💋']));
});

// ---- Tape par terre : il y va ----
let walkTarget = null;
screenEl.addEventListener('click', (e) => {
  const t = e.target;
  if (!(t === screenEl || t.classList.contains('sprite-layer') || t.classList.contains('backdrop'))) return;
  if (!canAct()) return;
  const mode = himMode();
  if (mode === 'sleep') return showBubble('Chut… il dort 🤫', 1200);
  if (mode !== 'normal') return;
  if (walkSpeed() === 0) return showBubble('Trop fatigué pour bouger 😪', 1600);
  const rect = screenEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  walkTarget = Math.max(6, Math.min(screenEl.clientWidth - spriteEl.offsetWidth - 12, x - spriteEl.offsetWidth / 2));
  pauseUntil = 0;
  spawnHeart((x - 8) + 'px', Math.max(30, rect.bottom - e.clientY) + 'px', '✨');
  if (Math.random() < 0.35) showBubble(pick(["J'arrive ! 🏃", 'Me voilà !', 'Par ici ? 👀']), 1100);
});

// ---- Ses envies ----
const WISHES = [
  { id: 'meals', e: '🍔', say: "J'ai trop envie de manger un truc 🍔" },
  { id: 'runs', e: '🏃', say: 'On va courir un peu ? 🏃' },
  { id: 'hugs', e: '🫂', say: "J'ai besoin d'un câlin 🥺" },
  { id: 'games', e: '🎮', say: 'On joue à un jeu ? 🎮' },
  { id: 'moments', e: '💑', say: 'On fait un truc à deux ? 💑' },
  { id: 'strokes', e: '🤲', say: 'Une petite caresse ? 🥰 (frotte-moi)' },
  { id: 'tickles', e: '😆', say: 'Chatouille-moi ! (tape 3 fois) 😆' }
];
const WISH_TIME = 2 * 60 * 1000;
let wish = null;
let lastWishAt = Date.now();
const wishEl = $('wish');

function maybeWish() {
  if (wish || himMode() !== 'normal' || busy || Date.now() - lastWishAt < 50 * 1000 || Math.random() > 0.12) return;
  const w = pick(WISHES);
  wish = { ...w, base: state.counters[w.id], until: Date.now() + WISH_TIME };
  lastWishAt = Date.now();
  wishEl.textContent = w.e;
  wishEl.hidden = false;
  sfx.pop();
  showBubble(w.say, 2600);
}

function checkWish() {
  if (!wish) return;
  if (state.counters[wish.id] > wish.base) {
    state.counters.wishes++;
    state.happy = clamp(state.happy + 10);
    state.love = clamp(state.love + 5);
    toast('Souhait exaucé ! ⭐', A.icoHappy);
    earn(3);
    sfx.coin();
    spawnHeart((spriteEl.offsetLeft + 10) + 'px', '100px', '⭐', true);
    wish = null;
    wishEl.hidden = true;
    gainXp(5);
    renderStats();
    checkTrophies();
  } else if (Date.now() > wish.until) {
    wish = null;
    wishEl.hidden = true;
    state.happy = clamp(state.happy - 3);
    if (!busy) showBubble('Tant pis… 😕', 1500);
  }
}
wishEl.addEventListener('click', (e) => { e.stopPropagation(); if (wish) showBubble(wish.say, 2200); });

function syncWish() {
  if (wishEl.hidden) return;
  const show = !busy && himMode() === 'normal';
  wishEl.style.visibility = show ? 'visible' : 'hidden';
  wishEl.style.left = (spriteEl.offsetLeft + spriteEl.offsetWidth / 2 + 6) + 'px';
  wishEl.style.top = Math.max(2, spriteEl.offsetTop - 40) + 'px';
}
