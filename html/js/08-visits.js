// =====================================================================
//  Ses visites
// =====================================================================
const SWEET_MESSAGES = [
  'Coucou mon cœur 😘',
  'Tu me manques 💌',
  'Je pense à toi 💕',
  'Bisous de loin 💋',
  "T'es le meilleur ⛽💛"
];
let firstVisitDone = false;
let isNewDay = false;

function scheduleGirlVisit(firstDelay) {
  const delay = firstDelay || rand(7000, 16000) * (1 + (5 - Sim.bond(state, Date.now())) * 0.3);
  setTimeout(() => {
    if (!window.__noVisits && canAct() && himMode() !== 'sleep' && (!firstVisitDone || Math.random() < 0.8)) startGirlVisit();
    scheduleGirlVisit();
  }, delay);
}

function startGirlVisit() {
  if (!canAct()) return;
  girlBusy = true;
  busy = true;
  stopHim();

  const screenWidth = screenEl.clientWidth;
  const fromLeft = Math.random() < 0.5;
  let gx = fromLeft ? -40 : screenWidth + 10;
  const himW = spriteEl.offsetWidth || 50, herW = 52;
  let targetX = fromLeft ? posX - herW - 6 : posX + himW + 6;
  if (targetX < 4 || targetX > screenWidth - herW - 4) targetX = fromLeft ? posX + himW + 6 : posX - herW - 6;
  targetX = Math.max(4, Math.min(screenWidth - herW - 4, targetX));

  if (!state.sulk) spriteEl.style.transform = fromLeft ? 'scaleX(-1)' : 'scaleX(1)';

  spriteHerEl.style.left = gx + 'px';
  spriteHerEl.style.bottom = '26px';
  spriteHerEl.src = A.herWalk;
  spriteHerEl.style.transform = fromLeft ? 'scaleX(1)' : 'scaleX(-1)';
  spriteHerEl.classList.add('visible');

  let frame = 0;
  const herWalkTimer = setInterval(() => {
    frame = 1 - frame;
    spriteHerEl.src = frame === 0 ? A.herWalk : A.herStand;
    gx += fromLeft ? 7.5 : -7.5;
    spriteHerEl.style.left = gx + 'px';
    if (fromLeft ? gx >= targetX : gx <= targetX) {
      clearInterval(herWalkTimer);
      spriteHerEl.src = A.herStand;
      girlArrived(fromLeft);
    }
  }, 160);
}

function visitMessage() {
  if (pendingNotes.length) {
    const n = pendingNotes.shift();
    state.counters.notesGot++;
    addMemory('💌 ' + n.text, 'special');
    return { msg: '💌 ' + n.text, fx: ['💌', 'icoHeart', '💕'], big: true };
  }
  const special = specialToday();
  if (!firstVisitDone) {
    firstVisitDone = true;
    if (special) {
      if (isNewDay) toast('💌 Nouveau souvenir dans le carnet');
      return { msg: special.msg, fx: special.fx, big: true, scene: special.scene };
    }
    if (isNewDay) {
      const note = noteOfTheDay();
      toast('💌 Mot du jour ajouté au carnet');
      return { msg: note, fx: ['💌', '💕'], big: true };
    }
    const ph = phase();
    return { msg: ph === 'day' ? 'Coucou toi ☀️' : (ph === 'dusk' ? 'Bonne soirée mon cœur 🌇' : 'Encore debout ? 🌙'), fx: ['💕'] };
  }
  if (special && Math.random() < 0.4) return { msg: special.msg, fx: special.fx, big: true };
  const wc = Math.random() < 0.3 ? weatherComment() : null;
  if (wc) return { msg: wc, fx: ['💕'] };
  if (state.sick) return { msg: 'Oh mon pauvre... soigne-toi 🤒💕', fx: ['💕'] };
  if (state.sulk) return { msg: 'Allez, fais pas la tête 🥺', fx: ['💕'] };
  return { msg: pick(SWEET_MESSAGES), fx: ['💕'] };
}

function girlArrived(cameFromLeft) {
  const herIsRightOfHim = parseFloat(spriteHerEl.style.left) > posX;
  if (!state.sulk && !state.sick) spriteEl.style.transform = herIsRightOfHim ? 'scaleX(1)' : 'scaleX(-1)';
  spriteHerEl.style.transform = herIsRightOfHim ? 'scaleX(-1)' : 'scaleX(1)';

  const v = visitMessage();
  const herFace = state.sick ? A.herSad : (state.sulk ? A.herSurprised : A.herHappy);
  showBubble(v.msg, v.big ? 3600 : 2600, herFace);
  if (v.scene && sceneOf(v.scene)) {
    setTimeout(() => {
      actionImg.src = sceneOf(v.scene); actionImg.hidden = false; actionEmoji.hidden = true;
      actionImg.classList.add('scene');
      actionCaption.textContent = v.msg;
      actionVisual.classList.add('show');
      if (MOMENT[v.scene] && MOMENT[v.scene].auto) addToAlbum(v.scene);
      setTimeout(() => actionVisual.classList.remove('show'), 3000);
    }, 1400);
  }
  flashMood(state.sick ? A.himSick : A.himHappy, v.big ? 3400 : 2000);
  state.love = clamp(state.love + (v.big ? 24 : 10));
  state.happy = clamp(state.happy + (v.big ? 20 : 6));
  state.counters.visits++;
  updateConditions();
  renderStats();
  checkTrophies();
  v.fx.forEach((e, i) => setTimeout(() => spawnHeart(spriteHerEl.style.left, `${78 + i * 14}px`, e), i * 200));

  let blinkFrame = 0;
  const blinkTimer = setInterval(() => {
    if (!spriteHerEl.classList.contains('visible')) { clearInterval(blinkTimer); return; }
    if (!v.big) return;
    blinkFrame = 1 - blinkFrame;
    spriteHerEl.src = blinkFrame === 0 ? A.herJump : A.herStand;
  }, 420);
  if (v.big) spriteHerEl.src = A.herJump;

  const stay = v.big ? 3400 : 2000;
  const act = !v.big && Math.random() < 0.6 ? pick(HER_ACTS) : null;
  if (act) setTimeout(() => herActivity(act), stay - 300);
  setTimeout(() => {
    clearInterval(blinkTimer);
    leaveGirl(cameFromLeft);
  }, stay + (act ? 2800 : 0));
}

function leaveGirl(cameFromLeft) {
  const screenWidth = screenEl.clientWidth;
  let gx = parseFloat(spriteHerEl.style.left);
  spriteHerEl.classList.remove('pose-sit');
  spriteHerEl.style.transform = cameFromLeft ? 'scaleX(-1)' : 'scaleX(1)';

  let frame = 0;
  const exitTimer = setInterval(() => {
    frame = 1 - frame;
    spriteHerEl.src = frame === 0 ? A.herWalk : A.herStand;
    gx += cameFromLeft ? -7.5 : 7.5;
    spriteHerEl.style.left = gx + 'px';
    if (cameFromLeft ? gx <= -50 : gx >= screenWidth + 20) {
      clearInterval(exitTimer);
      spriteHerEl.classList.remove('visible');
      girlBusy = false;
      busy = false;
      refreshHim(true);
    }
  }, 160);
}

// ---- Câlin ----
const hugVisual = $('hugVisual');
const HUG_CAPTIONS = ['Câlin de ta copine 🥰', 'Un gros bisou rien que pour toi 💋', 'Team pour la vie 💕⛽'];

$('btnHug').addEventListener('click', () => {
  if (!canAct()) return busyHint();
  busy = true;
  girlBusy = true;
  stopHim();
  bubbleEl.classList.remove('show');
  spriteHerEl.classList.remove('visible');

  $('hugCaption').textContent = pick(HUG_CAPTIONS);
  hugVisual.classList.add('show');
  spawnHeart('40%', '150px', '💕');
  setTimeout(() => spawnHeart('55%', '160px', '💖'), 250);
  setTimeout(() => spawnHeart('48%', '140px', '💗'), 500);

  const beforeHug = snap();
  sfx.happy();
  buzz(40);
  state.love = clamp(state.love + (isPers('love') ? 34 : 26));
  act('love', 4);
  trainFor('hugs');
  state.happy = clamp(state.happy + 18);
  state.hunger = clamp(state.hunger + 4);
  state.energy = clamp(state.energy + 6);
  state.counters.hugs++;
  addToAlbum('amour');
  const sulkBefore = state.sulk;
  afterCare();
  gainXp(6);
  updateConditions(true);
  renderStats();
  showDeltas(beforeHug);
  checkTrophies();
  const unsulked = sulkBefore && !state.sulk;

  setTimeout(() => {
    hugVisual.classList.remove('show');
    busy = false;
    girlBusy = false;
    refreshHim(true);
    renderStats();
    if (unsulked) showBubble('Bon... je boude plus 😳', 2200);
  }, 1900);
});
