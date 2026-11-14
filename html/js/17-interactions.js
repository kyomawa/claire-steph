// =====================================================================
//  Petit câlin (appui long), elle, l'humeur
// =====================================================================
function cuddle() {
  if (!canAct()) return;
  const mode = himMode();
  if (mode === 'sleep') { showBubble('*se blottit en dormant* 😴', 1600); state.love = clamp(state.love + 2); renderStats(); return; }
  const before = snap();
  state.love = clamp(state.love + 5);
  state.happy = clamp(state.happy + 3);
  state.counters.hugs++;
  state.counters.cuddles++;
  act('love', 1);
  squash();
  gainXp(2);
  if (mode === 'normal') strikePose(A.himStand, null, 1200);
  showBubble(pick(['Un câlin tout doux 🫂', 'Reste encore un peu 🥺', 'Mmmh… 💞']), 1600);
  ['💞', '🫂', '💗'].forEach((e, i) => setTimeout(() => spawnHeart((spriteEl.offsetLeft + 6 + i * 16) + 'px', '90px', e), i * 140));
  sfx.happy();
  buzz(40);
  updateConditions();
  renderStats();
  showDeltas(before);
  checkTrophies();
}

spriteHerEl.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!spriteHerEl.classList.contains('visible')) return;
  const before = snap();
  state.love = clamp(state.love + 3);
  state.counters.herKisses++;
  showBubble(pick(['Mwah ! 💋', 'Toi aussi tu me manques 🥰', 'Hihi 😚', 'Je t’aime fort 💕']), 1500, A.herHappy);
  spawnHeart((spriteHerEl.offsetLeft + 10) + 'px', '95px', pick(['💋', 'icoHeart', '💕']));
  sfx.kiss();
  buzz(20);
  renderStats();
  showDeltas(before);
  checkTrophies();
});

moodEl.style.cursor = 'pointer';
moodEl.addEventListener('click', (e) => {
  e.stopPropagation();
  openStatus();
});
