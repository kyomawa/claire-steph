// =====================================================================
//  Le temps qui passe (jeu ouvert)
// =====================================================================
let lastTickAt = Date.now();
function tick() {
  const t = Date.now();
  const gap = t - lastTickAt;
  lastTickAt = t;
  applyPhase();
  if (busy || game.active) return;

  if (gap > 60 * 1000) {
    catchUp(t - gap);              // onglet en veille : on rattrape
  } else if (himMode() === 'sleep') {
    state.energy = clamp(state.energy + 1.6);
    state.hunger = clamp(state.hunger - 0.3);
    state.love = clamp(state.love - 0.1);
  } else {
    state.hunger = clamp(state.hunger - rand(0.6, 1.6));
    state.energy = clamp(state.energy - rand(0.4, 1.2));
    state.happy = clamp(state.happy - rand(0.4, 1.2) * (state.sick ? 2 : 1));
    state.love = clamp(state.love - rand(0.2, 0.7));
    // digestion : après les repas, un petit caca finit par arriver
    state.happy = clamp(state.happy - state.poops.length * 0.5);
    if (state.digest >= 45 && state.poops.length < 3 && Math.random() < 0.2) {
      state.digest -= 45;
      addPoop();
      renderPoops();
      showBubble('Oups... 💩', 1800);
    }
    if (state.poops.length >= 3 && !state.sick && Math.random() < 0.06) {
      state.sick = true;
      state.sulk = false;
      showBubble("C'est pas très propre ici... 🤢", 2400);
    }
  }
  updateConditions();
  renderStats();
  refreshHim();
  checkWish();
  maybeWish();
  maybeAsk();

  if (himMode() !== 'normal' || bubbleEl.classList.contains('show')) return;
  if (state.hunger < 20 && Math.random() < 0.5) showBubble("J'ai faim... 🍔", 2000);
  else if (state.energy < 20 && Math.random() < 0.5) showBubble('Fatigué... 😪', 2000);
  else if (state.love < 30 && Math.random() < 0.5) showBubble('Tu me manques... 💌', 2200);
}
