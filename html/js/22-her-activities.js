// =====================================================================
//  Ses activités à elle pendant ses visites
// =====================================================================
const HER_ACTS = [
  { src: () => A.herRead, say: 'Je lis un peu à côté de toi 📖' },
  { src: () => A.herPhone, say: 'Selfie ! 📸', selfie: true },
  { src: () => A.herDrink, say: 'Un petit café avec toi ☕', d: { energy: 4 } },
  { src: () => A.herEat, say: 'Je t’ai pris une glace 🍦', d: { hunger: 8, happy: 4 } },
  { src: () => A.herSport, say: 'Allez, on bouge un peu ! 💪', d: { energy: -4, happy: 5 } },
  { src: () => A.herSit, say: 'Je me pose un peu avec toi 😌', pose: 'pose-sit', d: { love: 3 } },
  { src: () => A.herWork, say: 'Je finis un mail et je suis toute à toi 💻' }
];

function herActivity(act) {
  if (!spriteHerEl.classList.contains('visible')) return;
  spriteHerEl.src = act.src();
  if (act.pose) spriteHerEl.classList.add(act.pose);
  showBubble(act.say, 2600, A.herHappy);
  const before = snap();
  state.love = clamp(state.love + 2);
  for (const [k, v] of Object.entries(act.d || {})) state[k] = clamp(state[k] + v);
  if (act.selfie) {
    const fl = el('div', 'flash');
    screenEl.appendChild(fl);
    setTimeout(() => fl.remove(), 600);
    sfx.coin();
    state.counters.selfies++;
    if (addMemory('📸 Selfie ensemble', 'note')) toast('📸 Selfie ajouté au carnet');
    flashMood(A.himHappy, 1500);
  } else sfx.pop();
  renderStats();
  showDeltas(before);
  checkTrophies();
}
