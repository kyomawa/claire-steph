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
  const mode = himMode();
  if (mode === 'sleep') return showBubble('Il dort… 😴', 1400);
  const needs = [];
  if (state.sick) needs.push('je suis malade 🤒 (💊)');
  if (state.hunger < 40) needs.push("j'ai faim 🍔");
  if (state.energy < 35) needs.push('je suis crevé 😪');
  if (state.poops.length) needs.push("c'est sale ici 💩");
  if (state.love < 40) needs.push('un câlin ? 🥺');
  if (state.happy < 40) needs.push("je m'ennuie 🎮");
  showBubble(needs.length ? 'Bof… ' + needs.slice(0, 2).join(', ') : pick(['Tout va bien 😎', 'Je suis au top 💪', 'La belle vie 🏖️']), 2400);
  sfx.tap();
});
