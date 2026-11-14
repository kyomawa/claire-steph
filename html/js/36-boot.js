// =====================================================================
//  Démarrage
// =====================================================================
function startDay() {
  const today = dayKey(now());
  if (state.lastVisitDay === today) return;
  const y = now(); y.setDate(y.getDate() - 1);
  state.streak = state.lastVisitDay === dayKey(y) ? state.streak + 1 : 1;
  if (state.lastVisitDay) backupYesterday();
  state.lastVisitDay = today;
  isNewDay = true;
}

function welcomeBack(hours) {
  if (hours < 1) return;
  const h = Math.round(hours);
  const absent = h >= 24 ? `${Math.round(h / 24)} jour${h >= 48 ? 's' : ''}` : `${h} h`;
  let msg;
  if (state.sick) msg = `${absent} sans toi... je suis malade 🤒`;
  else if (state.hunger < 30) msg = `${absent} sans toi... j'ai trop faim 🍔`;
  else if (state.sulk) msg = `${absent} sans nouvelles... 😤`;
  else if (isNight()) msg = null;
  else msg = `Te revoilà ! ${absent} que j'attendais 🥺`;
  if (msg) setTimeout(() => showBubble(msg, 3200), 700);
  return !!msg;
}

makeStars();
$('hugImg').src = sceneOf('amour');
spriteHerEl.src = A.herStand;
document.querySelectorAll('[data-ico]').forEach((img) => { img.src = A[img.dataset.ico]; });
loadState();
const loadedPlayed = playedOf(state);
requestPersist();
const away = catchUp(state.lastSeen);
startDay();
if (isNewDay) {
  const sp = specialToday();
  if (sp) { addMemory(sp.msg, 'special'); unlock('special'); }
  else addMemory(noteOfTheDay(), 'note');
  if (isNight()) toast('💌 Mot du jour ajouté au carnet');
}
updateConditions(true);
applyPhase();
spriteEl.style.left = posX + 'px';
for (const it of ITEMS) if (it.u.type === 'level' && it.u.n <= 1 && !state.owned[it.id]) state.owned[it.id] = dayKey(now());
addWearHost(spriteEl, spriteEl.parentElement);
addWearHost(catcherEl, gameEl);
addWearHost($('previewHim'), $('preview'), () => false);
$('previewHim').src = A.himStand;
seasonDeco();
renderPoops();
renderStats();
refreshHim(true);
checkTrophies();
requestAnimationFrame(frame);
cloudInit(loadedPlayed);
renderSoundBtn();
checkDaily();
renderTokens();
morningWake();
if (!state.seenHelp && !window.__noHelp) setTimeout(() => { helpModal.hidden = false; }, 900);
const welcomed = welcomeBack(away);
scheduleGirlVisit(welcomed ? rand(4500, 5500) : rand(2200, 3500));
setInterval(tick, 6000);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { saveState(); cloudPush(true); return; }
  cloudPull(playedOf(state));
  fetchNotes();
  const t = Date.now();
  if (t - lastTickAt > 60 * 1000 && !busy) {
    catchUp(lastTickAt);
    lastTickAt = t;
    updateConditions();
    applyPhase();
    renderStats();
    refreshHim(true);
  }
});
window.addEventListener('pagehide', () => { saveState(); cloudPush(true); });
