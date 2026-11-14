// =====================================================================
//  Affichage
// =====================================================================
function colorForValue(v) {
  const css = getComputedStyle(document.documentElement);
  if (v > 60) return css.getPropertyValue('--good');
  if (v > 30) return css.getPropertyValue('--mid');
  return css.getPropertyValue('--low');
}

function renderStats() {
  for (const k of ['hunger', 'energy', 'happy']) {
    $('bar-' + k).style.width = state[k] + '%';
    $('bar-' + k).style.background = colorForValue(state[k]);
  }
  $('bar-love').style.width = state.love + '%';
  $('bar-love').style.background = getComputedStyle(document.documentElement).getPropertyValue('--love');

  const face = moodFace();
  if (moodEl.getAttribute('src') !== face) moodEl.src = face;

  $('btnHeal').classList.toggle('alert', state.sick);

  const lvl = levelFor(state.xp);
  const lo = xpFloor(lvl), hi = xpFloor(lvl + 1);
  $('hudLevel').textContent = `⭐ Niv. ${lvl}`;
  if (typeof renderRank === 'function') renderRank();
  $('xpFill').style.width = Math.round(((state.xp - lo) / (hi - lo)) * 100) + '%';
  const days = daysTogether();
  $('hudDays').textContent = CONFIG.coupleStart ? `💑 ${days.toLocaleString('fr-FR')} j` : `🗓️ ${days}`;
  $('hudDays').title = CONFIG.coupleStart ? 'Jours ensemble' : 'Jours depuis le début du jeu';
  $('hudStreak').textContent = `🔥 ${state.streak}`;

  saveState();
}

function applyPhase() {
  if (typeof applyWeather === 'function') applyWeather();
  const ph = phase();
  screenEl.classList.toggle('night', ph === 'night');
  screenEl.classList.toggle('dusk', ph === 'dusk');
  applyDecor();
}

function makeStars() {
  const sky = $('sky');
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = rand(3, 97) + '%';
    s.style.top = rand(4, 62) + '%';
    s.style.animationDelay = rand(0, 2.4) + 's';
    sky.appendChild(s);
  }
}

let moodOverride = null, moodOverrideUntil = 0;
function moodFace() {
  if (moodOverride && Date.now() < moodOverrideUntil) return moodOverride;
  const avg = (state.hunger + state.energy + state.happy + state.love) / 4;
  const mode = himMode();
  if (mode === 'sick') return A.himSick;
  if (mode === 'sleep') return A.icoTired;
  if (mode === 'sulk') return A.himAngry;
  if (state.energy < 25) return A.himTired;
  if (avg > 55 && state.poops.length < 2) return A.himHappy;
  return A.himSad;
}
function flashMood(face, ms) {
  moodOverride = face; moodOverrideUntil = Date.now() + ms;
  moodEl.src = face;
  setTimeout(() => { moodEl.src = moodFace(); }, ms + 20);
}

const bubbleFace = $('bubbleFace');
function showBubble(text, ms, face) {
  $('bubbleText').textContent = text;
  bubbleEl.classList.toggle('with-face', !!face);
  if (face) bubbleFace.src = face;
  bubbleEl.classList.add('show');
  clearTimeout(showBubble._t);
  showBubble._t = setTimeout(() => bubbleEl.classList.remove('show'), ms || 2200);
}

function spawnHeart(leftPx, bottomPx, emoji, big) {
  const isIco = typeof emoji === 'string' && emoji.startsWith('ico') && A[emoji];
  const heart = document.createElement(isIco ? 'img' : 'div');
  heart.className = 'heart' + (big ? ' big' : '');
  if (isIco) { heart.src = A[emoji]; heart.alt = ''; heart.style.height = big ? '26px' : '20px'; }
  else heart.textContent = emoji || '💙';
  heart.style.left = leftPx;
  heart.style.bottom = bottomPx;
  screenEl.appendChild(heart);
  setTimeout(() => heart.remove(), 1700);
}

// petite fenêtre de confirmation (remplace confirm(), bloqué dans certains navigateurs intégrés)
function askConfirm(text, okLabel, danger) {
  return new Promise((resolve) => {
    const box = document.getElementById('confirmBox');
    document.getElementById('confirmText').textContent = text;
    const ok = document.getElementById('confirmOk');
    const no = document.getElementById('confirmNo');
    ok.textContent = okLabel || 'Oui';
    ok.classList.toggle('danger', !!danger);
    box.hidden = false;
    ok.focus();
    const done = (v) => { box.hidden = true; ok.onclick = no.onclick = box.onclick = null; resolve(v); };
    ok.onclick = () => done(true);
    no.onclick = () => done(false);
    box.onclick = (e) => { if (e.target === box) done(false); };
  });
}

const toastQueue = [];
let toastBusy = false;
function toast(text, icon) {
  toastQueue.push([text, icon]);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const t = toastQueue.shift();
  const el = $('toast');
  if (!t) { toastBusy = false; return; }
  toastBusy = true;
  $('toastText').textContent = t[0];
  if (t[1]) $('toastIco').src = t[1]; else $('toastIco').removeAttribute('src');
  el.classList.add('show');
  setTimeout(() => { el.classList.remove('show'); setTimeout(nextToast, 400); }, 2600);
}
