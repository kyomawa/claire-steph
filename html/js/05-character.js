// =====================================================================
//  Lui : humeur, sommeil, maladie, bouderie
// =====================================================================
let busy = false;
let girlBusy = false;
let awakeUntil = 0;
let direction = 1;
let posX = 40;

function himMode() {
  if (state.sick) return 'sick';
  if (isNight() && Date.now() > awakeUntil) return 'sleep';
  if (state.sulk) return 'sulk';
  return 'normal';
}

function updateConditions(silent) {
  const avg = (state.hunger + state.energy + state.happy + state.love) / 4;
  if (!state.sick && (state.hunger <= 5 || avg < 18)) {
    state.sick = true;
    state.sulk = false;
    if (!silent) showBubble('Je me sens pas bien... 🤒', 2600);
  }
  if (!state.sick && !state.sulk && state.love < 20) {
    state.sulk = true;
    if (!silent) showBubble("Tu t'occupes plus de moi... 😤", 2600);
  } else if (state.sulk && state.love >= 35) {
    state.sulk = false;
    if (!silent) setTimeout(() => showBubble('Bon... je boude plus 😳', 2200), 300);
  }
}

let walkFrame = 0, walkTimer = null, bounceTimer = null, fxTimer = null, bounceUp = false;
let currentMode = null;
let pauseUntil = 0;

const POSES = ['pose-sit', 'pose-lie', 'pose-sleep', 'pose-jump'];
function setPose(src, pose) {
  spriteEl.src = src;
  spriteEl.classList.remove(...POSES);
  if (pose) spriteEl.classList.add(pose);
}

function stopHim() {
  clearInterval(walkTimer); clearInterval(bounceTimer); clearInterval(fxTimer);
  currentMode = null;
  pauseUntil = 0;
}

function walkSpeed() { return state.energy < 25 ? 0 : (state.energy < 55 ? 1 : 2); }

// Petites pauses de vie pendant qu'il se promène (lire, téléphone, boire…)
const IDLE_PAUSES = [
  { src: () => A.himRead, text: 'Un petit chapitre 📖' },
  { src: () => A.himPhone, text: 'Je regarde mes messages 📱' },
  { src: () => A.himDrink, text: "Une gorgée d'eau 💧" },
  { src: () => A.himSport, text: 'Allez, quelques haltères 💪' }
];

function strikePose(src, pose, ms) {
  if (busy || !currentMode || !currentMode.startsWith('normal')) return;
  pauseUntil = Date.now() + ms;
  setPose(src, pose);
  spriteEl.style.bottom = '';
  setTimeout(() => { if (Date.now() >= pauseUntil && currentMode) refreshHim(true); }, ms + 30);
}

function refreshHim(force) {
  if (busy) return;
  const mode = himMode();
  const key = mode === 'normal' ? 'normal' + walkSpeed() : mode;
  if (!force && key === currentMode) return;
  stopHim();
  currentMode = key;
  spriteEl.classList.remove('sickly');
  spriteEl.style.bottom = '';
  const screenWidth = screenEl.clientWidth;

  if (mode === 'sleep') {
    setPose(A.himSleep, 'pose-sleep');
    posX = (screenWidth - 60) / 2;
    spriteEl.style.left = posX + 'px';
    spriteEl.style.transform = 'none';
    fxTimer = setInterval(() => spawnHeart((posX + 50) + 'px', '84px', '💤'), 2400);
    return;
  }

  posX = Math.min(posX, screenWidth - 76);
  spriteEl.style.left = posX + 'px';

  if (mode === 'sick') {
    setPose(A.himLie, 'pose-lie');
    spriteEl.classList.add('sickly');
    spriteEl.style.transform = 'scaleX(1)';
    fxTimer = setInterval(() => spawnHeart((posX + 30) + 'px', '70px', pick(['icoSick', '🤧', 'icoSick'])), 2600);
    return;
  }

  if (mode === 'sulk') {
    setPose(A.himSit, 'pose-sit');
    spriteEl.style.transform = 'scaleX(-1)';
    fxTimer = setInterval(() => spawnHeart((posX + 30) + 'px', '90px', pick(['💢', 'icoStress', '🌧️'])), 3000);
    return;
  }

  const speed = walkSpeed();
  if (speed === 0) {
    setPose(A.himSit, 'pose-sit');
    fxTimer = setInterval(() => spawnHeart((posX + 30) + 'px', '90px', 'icoTired'), 3200);
    return;
  }

  setPose(A.himStand, null);
  const frames = speed === 2 ? [A.himWalk, A.himRun] : [A.himStand, A.himWalk];
  walkTimer = setInterval(() => {
    if (Date.now() < pauseUntil) return;
    if (walkTarget !== null) {
      direction = walkTarget > posX ? 1 : -1;
      if (Math.abs(walkTarget - posX) <= (speed === 2 ? 8 : 5)) {
        posX = walkTarget;
        walkTarget = null;
        spriteEl.style.left = posX + 'px';
        strikePose(A.himStand, null, 1600);
        return;
      }
    } else if (speed === 1 && Math.random() < 0.006) {
      const p = pick(IDLE_PAUSES);
      strikePose(p.src(), null, 3800);
      if (!bubbleEl.classList.contains('show')) showBubble(p.text, 2000);
      return;
    }
    walkFrame = 1 - walkFrame;
    setPose(frames[walkFrame], null);

    const maxX = screenEl.clientWidth - spriteEl.clientWidth - 12;
    posX += direction * (speed === 2 ? 8 : 4.5);
    if (posX >= maxX) { posX = maxX; direction = -1; }
    if (posX <= 6) { posX = 6; direction = 1; }
    spriteEl.style.left = posX + 'px';
    spriteEl.style.transform = direction === 1 ? 'scaleX(1)' : 'scaleX(-1)';
  }, speed === 2 ? 130 : 190);

  bounceTimer = setInterval(() => {
    if (Date.now() < pauseUntil) return;
    bounceUp = !bounceUp;
    spriteEl.style.bottom = bounceUp ? '29px' : '26px';
  }, speed === 2 ? 70 : 100);
}

// ---- Cacas ----
const poopsEl = $('poops');
function addPoop() {
  if (state.poops.length >= 3) return;
  state.poops.push(Math.round(rand(8, 82)));
}
function renderPoops() {
  poopsEl.replaceChildren(...state.poops.map((x, i) => {
    const img = document.createElement('img');
    img.className = 'poop';
    img.src = A.icoPoop;
    img.alt = 'caca';
    img.style.left = x + '%';
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      if (game.active) return;
      state.poops.splice(i, 1);
      state.counters.cleaned++;
      state.happy = clamp(state.happy + 3);
      gainXp(1);
      spawnHeart(x + '%', '40px', '✨');
      renderPoops();
      renderStats();
      checkTrophies();
    });
    return img;
  }));
}
