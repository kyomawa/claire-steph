// =====================================================================
//  Garde-robe : accessoires + compagnon
// =====================================================================
const SLOTS = [
  { id: 'tete', label: '🎩 Tête' }, { id: 'yeux', label: '🕶️ Yeux' }, { id: 'visage', label: '😊 Visage' },
  { id: 'cou', label: '🧣 Cou' }, { id: 'dos', label: '🪽 Dos' }, { id: 'compagnon', label: '🐾 Ami' },
  { id: 'decor', label: '🏠 Décor' }
];
const Lv = (n) => ({ type: 'level', n });
const Tr = (id) => ({ type: 'trophy', id });
const Mo = (...months) => ({ type: 'season', months });
const SPECIAL = { type: 'special' };

// Placement (fractions de l'image de la pose, repères dans ANCHORS) :
//  tête  : w = largeur × largeur de tête, b = bas du chapeau entre le front (0) et le haut des lunettes (1),
//          ou t = bas de l'objet entre le haut des cheveux (0) et le front (1) pour ce qui se pose dessus
//  yeux  : w = largeur × largeur des lunettes, dy = décalage vertical
//  visage: joues sous les lunettes
//  cou   : w = largeur × largeur du t-shirt, dy = décalage par rapport au col
//  dos   : w = largeur × largeur du sprite
const ITEMS = [
  { id: 'capGulf', n: 'Casquette Gulf', s: 'tete', u: Lv(1), f: { w: 1.18, b: 0.62, dx: 0.04 } },
  { id: 'capBeige', n: 'Casquette beige', s: 'tete', u: Lv(1), f: { w: 1.18, b: 0.62, dx: 0.04 } },
  { id: 'beanie', n: 'Bonnet gris', s: 'tete', u: Lv(1), f: { w: 1.1, b: 0.72 } },
  { id: 'headphones', n: 'Casque audio', s: 'tete', u: Lv(1), f: { w: 1.22, b: 1.85 } },
  { id: 'strawHat', n: 'Chapeau de paille', s: 'tete', u: Lv(2), f: { w: 1.55, b: 0.42 } },
  { id: 'fedora', n: 'Fedora', s: 'tete', u: Lv(3), f: { w: 1.45, b: 0.45 } },
  { id: 'catEars', n: 'Oreilles de chat', s: 'tete', u: Lv(4), f: { w: 1.05, t: 0.55 } },
  { id: 'bunnyEars', n: 'Oreilles de lapin', s: 'tete', u: Lv(4), f: { w: 0.85, t: 0.5 } },
  { id: 'crown', n: 'Couronne', s: 'tete', u: Lv(5), f: { w: 0.62, t: 0.55 } },
  { id: 'halo', n: 'Auréole', s: 'tete', u: Lv(7), f: { w: 0.78, t: -0.12 } },
  { id: 'chefHat', n: 'Toque de chef', s: 'tete', u: Tr('meals_30'), f: { w: 1.05, b: 0.45 } },
  { id: 'gradCap', n: 'Toque de diplômé', s: 'tete', u: Tr('codes_20'), f: { w: 1.35, b: 0.4 } },
  { id: 'flowerCrown', n: 'Couronne de fleurs', s: 'tete', u: Tr('streak_7'), f: { w: 1.08, t: 0.95 } },
  { id: 'partyHat', n: 'Chapeau de fête', s: 'tete', u: SPECIAL, f: { w: 0.5, t: 0.5, dx: 0.08 } },
  { id: 'witchHat', n: 'Chapeau de sorcier', s: 'tete', u: Mo(10), f: { w: 1.45, b: 0.45 } },
  { id: 'santaHat', n: 'Bonnet de Noël', s: 'tete', u: Mo(12), f: { w: 1.3, b: 0.68 } },
  { id: 'antlers', n: 'Bois de renne', s: 'tete', u: Mo(12), f: { w: 1.15, t: 0.6 } },
  { id: 'elfHat', n: 'Bonnet de lutin', s: 'tete', u: Mo(12), f: { w: 1.15, b: 0.62 } },
  { id: 'earmuffs', n: 'Cache-oreilles', s: 'tete', u: Mo(11, 12, 1, 2), f: { w: 1.2, b: 1.75 } },
  { id: 'beanieBlue', n: 'Bonnet à pompon', s: 'tete', u: Mo(1, 2), f: { w: 1.1, b: 0.72 } },

  { id: 'sunglasses', n: 'Lunettes de soleil', s: 'yeux', u: Lv(2), f: { w: 1.08 } },
  { id: 'heartGlasses', n: 'Lunettes cœur', s: 'yeux', u: Tr('first_hug'), f: { w: 1.02, dy: 0.01 } },
  { id: 'thugGlasses', n: 'Lunettes « deal with it »', s: 'yeux', u: Tr('game_15'), f: { w: 1.1 } },

  { id: 'blush', n: 'Joues roses', s: 'visage', u: Lv(3) },

  { id: 'scarfRed', n: 'Écharpe rouge', s: 'cou', u: Lv(1) },
  { id: 'scarfGrey', n: 'Écharpe grise', s: 'cou', u: Lv(2) },
  { id: 'scarfBlue', n: 'Écharpe bleue', s: 'cou', u: Lv(3) },
  { id: 'scarfOrange', n: "Écharpe d'automne", s: 'cou', u: Mo(9, 10, 11) },
  { id: 'necklaceTag', n: 'Plaque', s: 'cou', u: Lv(4), f: { w: 0.5, dy: -0.015 } },
  { id: 'necklaceGold', n: 'Chaîne en or', s: 'cou', u: Lv(5), f: { w: 0.58, dy: -0.015 } },
  { id: 'necklacePendant', n: 'Médaillon', s: 'cou', u: Lv(6), f: { w: 0.52, dy: -0.015 } },
  { id: 'necklaceBlue', n: 'Pendentif bleu', s: 'cou', u: Lv(8), f: { w: 0.52, dy: -0.015 } },

  { id: 'wings', n: "Ailes d'ange", s: 'dos', u: Lv(7) },
  { id: 'batWings', n: 'Ailes de chauve-souris', s: 'dos', u: Mo(10) },

  { id: 'petCat', n: 'Caramel le chat', s: 'compagnon', u: Lv(1), say: 'Miaou ! 🐱' },
  { id: 'petDog', n: 'Biscuit le chien', s: 'compagnon', u: Lv(2), say: 'Ouaf ouaf ! 🐶' },
  { id: 'petBunny', n: 'Flocon le lapin', s: 'compagnon', u: Lv(3), say: '*grignote* 🥕' },
  { id: 'petGreyCat', n: 'Pixel le chat gris', s: 'compagnon', u: Lv(4), say: 'Mrrraou ! 😼' },
  { id: 'petChick', n: 'Piou le poussin', s: 'compagnon', u: Lv(5), say: 'Piou piou ! 🐣' },
  { id: 'petPanda', n: 'Bambou le panda', s: 'compagnon', u: Lv(6), say: '*mâchouille du bambou* 🎋' },
  { id: 'petPenguin', n: 'Glaçon le pingouin', s: 'compagnon', u: Lv(7), say: '*dandine* 🐧' },
  { id: 'petFrog', n: 'Kermi la grenouille', s: 'compagnon', u: Lv(8), say: 'Croâ ! 🐸' },
  { id: 'petHedgehog', n: 'Choupi le hérisson', s: 'compagnon', u: Tr('days_30'), say: '*renifle* 🦔' }
];
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const SLOT_FIT = {
  tete: { w: 1.15, b: 0.6, dx: 0 },
  yeux: { w: 1.06, dy: 0 },
  visage: { w: 0.92, dy: 0.012 },
  cou: { w: 0.82, dy: -0.045 },
  dos: { w: 1.65, dy: 0.06 }
};

// position (en px dans l'image de la pose) d'un objet porté
function placeOn(slot, f, an, W, H, ratio) {
  let w, cx, top;
  if (slot === 'tete') {
    w = f.w * an.hw * W;
    cx = (an.cx + (f.dx || 0)) * W;
    const bottom = f.t !== undefined
      ? (an.top + f.t * (an.skin - an.top)) * H
      : (an.skin + f.b * (an.eyeY - an.skin)) * H;
    top = bottom - w * ratio;
  } else if (slot === 'yeux') {
    w = f.w * an.ew * W;
    cx = an.ex * W;
    top = (an.eyeY + (f.dy || 0)) * H - w * ratio * 0.18;
  } else if (slot === 'visage') {
    w = f.w * an.ew * W;
    cx = an.ex * W;
    top = (an.eyeB + (f.dy || 0)) * H;
  } else if (slot === 'cou') {
    w = f.w * an.sw * W;
    cx = an.sx * W;
    top = (an.neck + (f.dy || 0)) * H;
  } else {
    w = f.w * W;
    cx = an.sx * W;
    top = (an.neck + (f.dy || 0)) * H - w * ratio / 2;
  }
  return { w, cx, top };
}
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function unlockText(u) {
  if (u.type === 'level') return `Niveau ${u.n}`;
  if (u.type === 'trophy') { const t = TROPHIES.find((x) => x.id === u.id); return `Trophée « ${t ? t.t : u.id} »`; }
  if (u.type === 'season') return 'En ' + u.months.map((m) => MONTHS[m - 1]).join(' / ');
  return 'Un jour de fête';
}

function checkUnlocks(silent) {
  const lvl = levelFor(state.xp);
  const month = now().getMonth() + 1;
  for (const it of ITEMS) {
    if (state.owned[it.id]) continue;
    const u = it.u;
    const ok = (u.type === 'level' && lvl >= u.n) || (u.type === 'trophy' && !!state.trophies[u.id]) ||
      (u.type === 'season' && u.months.includes(month)) || (u.type === 'special' && !!specialToday());
    if (!ok) continue;
    state.owned[it.id] = dayKey(now());
    if (!silent) toast(`Nouveau dans la garde-robe : ${it.n}`, A[it.id]);
  }
}

// ---- Placement des accessoires sur un sprite ----
const POSE_OF = {};
for (const k of Object.keys(window.ANCHORS || {})) POSE_OF[A[k]] = k;
const WEAR_SLOTS = ['dos', 'cou', 'visage', 'yeux', 'tete'];
const wearHosts = [];

function addWearHost(img, container, flip) {
  const els = {};
  for (const s of WEAR_SLOTS) {
    const e = document.createElement('img');
    e.className = 'wear' + (s === 'dos' ? ' behind' : '');
    e.alt = '';
    e.hidden = true;
    container.appendChild(e);
    els[s] = e;
  }
  wearHosts.push({ img, els, flip: flip || (() => (img.style.transform || '').includes('-1')) });
}

function syncWear() {
  const wearSig = WEAR_SLOTS.map((s) => state.wear[s] || '').join('|');
  for (const h of wearHosts) {
    const an = window.ANCHORS[POSE_OF[h.img.getAttribute('src')]];
    const W = h.img.offsetWidth, H = h.img.offsetHeight;
    const sig = `${h.img.getAttribute('src')}|${h.img.offsetLeft}|${h.img.offsetTop}|${W}|${H}|${h.img.style.transform}|${h.img.style.visibility}|${wearSig}`;
    if (sig === h.sig && !WEAR_SLOTS.some((s) => h.els[s].hidden === false && !h.els[s].naturalWidth)) continue;
    h.sig = sig;
    const shown = an && W > 0 && h.img.style.visibility !== 'hidden';
    const flip = shown && h.flip();
    for (const s of WEAR_SLOTS) {
      const el = h.els[s];
      const it = ITEM[state.wear[s]];
      if (!shown || !it) { el.hidden = true; continue; }
      if (el.getAttribute('src') !== A[it.id]) el.src = A[it.id];
      if (!el.naturalWidth) { el.hidden = true; continue; }
      const f = { ...SLOT_FIT[s], ...(it.f || {}) };
      const { w, cx, top } = placeOn(s, f, an, W, H, el.naturalHeight / el.naturalWidth);
      el.hidden = false;
      el.style.width = w + 'px';
      el.style.left = (h.img.offsetLeft + (flip ? W - cx : cx) - w / 2) + 'px';
      el.style.top = (h.img.offsetTop + top) + 'px';
      el.style.transform = flip ? 'scaleX(-1)' : '';
    }
  }
}

// ---- Compagnon qui le suit ----
const petEl = $('pet');
let petX = 10, petFace = 1, petT = 0;
function syncPet(dt) {
  const it = ITEM[state.wear.compagnon];
  const show = !!it && !game.active;
  petEl.hidden = !show;
  if (!show) return;
  if (petEl.getAttribute('src') !== A[it.id]) petEl.src = A[it.id];
  const pw = petEl.offsetWidth || 30;
  const himL = spriteEl.offsetLeft, himW = spriteEl.offsetWidth;
  const right = !(spriteEl.style.transform || '').includes('-1');
  let target = right ? himL - pw - 2 : himL + himW + 2;
  if (petFetch === 'chase') target = ball.x + BALL / 2 - pw / 2;
  target = Math.max(2, Math.min(screenEl.clientWidth - pw - 2, target));
  const dx = target - petX;
  petX += dx * Math.min(1, dt * (petFetch ? 3.2 : 2.5));
  if (petFetch === 'chase' && ball.mode === 'rest' && Math.abs(dx) < 6) petCaughtBall();
  else if (petFetch === 'return' && Math.abs(dx) < 8) petBroughtBall();
  const moving = Math.abs(dx) > 3;
  if (moving) petFace = dx > 0 ? 1 : -1;
  petT += dt;
  petEl.style.left = petX + 'px';
  petEl.style.bottom = (26 + (moving ? Math.abs(Math.sin(petT * 11)) * 4 : 0)) + 'px';
  petEl.style.transform = petFace < 0 ? 'scaleX(-1)' : '';
}
petEl.addEventListener('click', () => {
  const it = ITEM[state.wear.compagnon];
  if (!it || !canAct()) return;
  showBubble(it.say, 1600, A[it.id]);
  state.happy = clamp(state.happy + 2);
  renderStats();
  spawnHeart(petX + 'px', '60px', 'icoHeart');
});

const SHADOWS = [
  { el: $('shadowHim'), of: () => spriteEl, show: () => spriteEl.style.visibility !== 'hidden' && !spriteEl.classList.contains('pose-sleep') && !spriteEl.classList.contains('pose-lie') },
  { el: $('shadowHer'), of: () => spriteHerEl, show: () => spriteHerEl.classList.contains('visible') },
  { el: $('shadowPet'), of: () => petEl, show: () => !petEl.hidden }
];
function syncShadows() {
  for (const sh of SHADOWS) {
    const t = sh.of();
    const on = sh.show() && t.offsetWidth > 0;
    sh.el.style.display = on ? '' : 'none';
    if (!on) continue;
    const w = t.offsetWidth * 0.8;
    const lift = Math.max(0, (parseFloat(t.style.bottom) || 26) - 26);
    sh.el.style.width = Math.max(10, w - lift * 2) + 'px';
    sh.el.style.left = (t.offsetLeft + (t.offsetWidth - Math.max(10, w - lift * 2)) / 2) + 'px';
    sh.el.style.opacity = String(Math.max(0.35, 1 - lift / 12));
  }
}

let lastFrame = performance.now();
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastFrame) / 1000);
  lastFrame = ts;
  // chaque système est isolé : si l'un plante, les autres continuent
  for (const step of [syncWear, () => syncPet(dt), syncWish, syncOverlays, syncShadows, syncFood, () => syncBall(dt)]) {
    try { step(); } catch (e) { if (typeof logError === 'function' && !frame.logged) { frame.logged = true; logError('animation : ' + e.message); } }
  }
  requestAnimationFrame(frame);
}

// ---- Décor de saison ----
function seasonDeco() {
  const m = now().getMonth() + 1;
  const floor = { 10: 'decoPumpkin', 12: 'decoCandy', 2: 'decoHeart', 3: 'decoClover' }[m];
  if (floor) {
    const d = document.createElement('img');
    d.className = 'deco-floor';
    d.src = A[floor];
    d.alt = '';
    screenEl.appendChild(d);
  }
  if (specialToday()) {
    const b = document.createElement('img');
    b.className = 'deco-balloon';
    b.src = A.decoBalloon;
    b.alt = '';
    screenEl.appendChild(b);
  }
  const fall = (m === 12 || m === 1) ? 'decoSnow' : ((m === 10 || m === 11) ? 'decoLeaf' : null);
  if (!fall) return;
  setInterval(() => {
    if (document.hidden) return;
    const f = document.createElement('img');
    f.className = 'falling';
    f.src = A[fall];
    f.alt = '';
    f.style.left = rand(0, 95) + '%';
    f.style.setProperty('--drift', rand(-40, 40) + 'px');
    f.style.setProperty('--rot', rand(-200, 200) + 'deg');
    screenEl.appendChild(f);
    setTimeout(() => f.remove(), 7200);
  }, 1400);
}

// ---- Fenêtre garde-robe ----
const closet = $('closet');
let closetSlot = 'tete';

function renderCloset() {
  const owned = ITEMS.filter((i) => state.owned[i.id]).length;
  $('closetTitle').textContent = `👕 Garde-robe · ${owned}/${ITEMS.length}`;
  const pet = ITEM[state.wear.compagnon];
  $('previewPet').hidden = !pet;
  if (pet) $('previewPet').src = A[pet.id];
  $('closetTabs').replaceChildren(...SLOTS.map((sl) => {
    const b = el('button', 'tab', sl.label);
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(sl.id === closetSlot));
    b.addEventListener('click', () => { closetSlot = sl.id; renderCloset(); });
    return b;
  }));
  const grid = $('closetGrid');
  applyDecor();
  if (closetSlot === 'decor') {
    grid.replaceChildren(...DECORS.map((d) => {
      const b = el('button', 'w-item' + (state.decor === d.id ? ' on' : ''));
      if (d.id === 'auto') b.append(el('span', 'w-none', '🗓️'));
      else if (d.id === 'none') b.append(el('span', 'w-none', '∅'));
      else { const img = el('img', 'w-decor'); img.src = A['decor_' + d.id]; img.alt = ''; b.append(img); }
      b.append(el('span', 'w-name', d.n));
      b.addEventListener('click', () => { state.decor = d.id; saveState(); renderCloset(); });
      return b;
    }));
    return;
  }
  const none = el('button', 'w-item' + (state.wear[closetSlot] ? '' : ' on'));
  none.append(el('span', 'w-none', '∅'), el('span', 'w-name', 'Rien'));
  none.addEventListener('click', () => equip(closetSlot, null));
  grid.replaceChildren(none, ...ITEMS.filter((i) => i.s === closetSlot).map((it) => {
    const have = !!state.owned[it.id];
    const b = el('button', 'w-item' + (have ? '' : ' locked') + (state.wear[closetSlot] === it.id ? ' on' : ''));
    const img = el('img');
    img.src = A[it.id];
    img.alt = '';
    b.append(img, el('span', 'w-name', have ? it.n : '🔒 ' + unlockText(it.u)));
    b.title = have ? it.n : `${it.n} — ${unlockText(it.u)}`;
    b.disabled = !have;
    b.addEventListener('click', () => equip(closetSlot, state.wear[closetSlot] === it.id ? null : it.id));
    return b;
  }));
}

function equip(slot, id) {
  state.wear[slot] = id;
  if (slot === 'compagnon' && id) { petX = spriteEl.offsetLeft - 30; showBubble(`${ITEM[id].n} est là ! ${ITEM[id].say}`, 2000); }
  checkTrophies();
  saveState();
  renderCloset();
}

$('btnStyle').addEventListener('click', () => { renderCloset(); closet.hidden = false; $('closetClose').focus(); });
$('closetClose').addEventListener('click', () => { closet.hidden = true; });
closet.addEventListener('click', (e) => { if (e.target === closet) closet.hidden = true; });
