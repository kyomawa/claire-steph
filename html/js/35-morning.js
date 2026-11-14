// =====================================================================
//  Réveil du matin
// =====================================================================
function morningWake() {
  const h = now().getHours();
  if (!isNewDay || h < 6 || h >= 11) return;
  setTimeout(() => {
    if (!canAct() || himMode() !== 'normal') return;
    strikePose(A.himJump, 'pose-jump', 1000);
    showBubble(pick(['Bien dormi ? ☀️ Un café ?', 'Bonjour toi ☀️', '*s’étire* Bonne journée ! 🌅']), 2600);
    flashMood(A.himHappy, 2000);
    const w = WISHES.find((x) => x.id === 'meals');
    if (w && !wish) {
      wish = { ...w, e: '☕', say: 'Un café pour bien démarrer ? ☕', base: state.counters.meals, until: Date.now() + WISH_TIME };
      lastWishAt = Date.now();
      wishEl.textContent = '☕';
      wishEl.hidden = false;
    }
  }, 1200);
}
