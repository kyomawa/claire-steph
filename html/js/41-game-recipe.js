// =====================================================================
//  Mini-jeu : Recette à deux (entraîne la cuisine)
//  Les ingrédients s'allument dans un ordre : on le refait. Un de plus à chaque plat.
// =====================================================================
const recipeEl = $('recipe');
const PANTRY = [
  { e: '🍅', n: 'Tomate', c: '#F26A21', f: 392 },
  { e: '🧀', n: 'Fromage', c: '#F2B92E', f: 494 },
  { e: '🌿', n: 'Basilic', c: '#3FA35B', f: 587 },
  { e: '🥚', n: 'Œuf', c: '#6FB6E0', f: 659 }
];
const DISHES = ['Bruschetta', 'Omelette', 'Pizza margherita', 'Lasagnes', 'Risotto', 'Quiche', 'Gratin', 'Tiramisu', 'Pâtes carbo', 'Festin de chef'];
const cook = { seq: [], pos: 0, round: 0, done: 0, phase: 'off', timers: [] };

function cookLater(fn, ms) { cook.timers.push(setTimeout(guard(fn, 'recette à deux'), ms)); }
function cookStop() { cook.timers.forEach(clearTimeout); cook.timers = []; }

function startRecipe() {
  if (!canAct()) return;
  beginGame();
  cookStop();
  cook.seq = [];
  cook.round = 0;
  cook.done = 0;
  cook.phase = 'off';
  $('recipePads').replaceChildren(...PANTRY.map((p, i) => {
    const b = el('button', 'recipe-pad');
    b.style.setProperty('--pad', p.c);
    b.setAttribute('aria-label', p.n);
    b.append(el('span', 'pad-emoji', p.e), el('span', 'pad-name', p.n));
    b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); pressPad(i); });
    b.addEventListener('click', (e) => { e.stopPropagation(); if (e.detail === 0) pressPad(i); });   // clavier
    return b;
  }));
  if (A.decor_cuisine) recipeEl.style.backgroundImage = `linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.86)), url("${A.decor_cuisine}")`;
  recipeEl.hidden = false;
  nextDish();
}

function flashPad(i, ms) {
  const b = $('recipePads').children[i];
  if (!b) return;
  b.classList.add('lit');
  tonePlay(PANTRY[i].f);
  setTimeout(() => b.classList.remove('lit'), ms);
}

function nextDish() {
  cook.round++;
  while (cook.seq.length < cook.round + 2) cook.seq.push(Math.floor(Math.random() * PANTRY.length));
  cook.pos = 0;
  cook.phase = 'show';
  $('recipeInfo').textContent = `🍳 Plat ${cook.round} · ${DISHES[(cook.round - 1) % DISHES.length]}`;
  $('recipeMsg').textContent = 'Regarde bien l’ordre… 👀';
  const step = Math.max(330, 600 - cook.round * 30);
  cook.seq.forEach((k, i) => cookLater(() => flashPad(k, step * 0.65), 800 + i * step));
  cookLater(() => {
    cook.phase = 'play';
    $('recipeMsg').textContent = `À toi ! 0 / ${cook.seq.length}`;
  }, 800 + cook.seq.length * step);
}

function pressPad(i) {
  if (cook.phase !== 'play') return;
  flashPad(i, 170);
  if (cook.seq[cook.pos] !== i) { failDish(); return; }
  cook.pos++;
  $('recipeMsg').textContent = `À toi ! ${cook.pos} / ${cook.seq.length}`;
  if (cook.pos < cook.seq.length) return;
  cook.done = cook.round;
  cook.phase = 'wait';
  sfx.coin();
  $('recipeMsg').textContent = pick(['Délicieux ! 😋', 'Miam ! 🤤', 'Un vrai chef ! 👨‍🍳', 'Parfait ! ✨']);
  if (cook.round >= DISHES.length) cookLater(endRecipe, 800);
  else cookLater(nextDish, 1000);
}

function failDish() {
  cook.phase = 'over';
  sfx.bad();
  buzz(60);
  $('recipeMsg').textContent = `Oups ! Il fallait ${PANTRY[cook.seq[cook.pos]].e} 😅`;
  cookLater(endRecipe, 1200);
}

function endRecipe() {
  cookStop();
  cook.phase = 'over';
  const n = cook.done;
  const stars = n >= 6 ? 3 : (n >= 3 ? 2 : 1);
  const record = n > (state.bestRecipe || 0);
  if (record) state.bestRecipe = n;
  $('recipeInfo').textContent = `${'⭐'.repeat(stars)} ${n} plat${n > 1 ? 's' : ''} réussi${n > 1 ? 's' : ''}${record ? ' · record !' : ''}`;
  $('recipeMsg').textContent = n >= 6 ? 'Un vrai duo de chefs 👩‍🍳👨‍🍳' : (n >= 3 ? 'On se régale ensemble 😋' : 'On commande une pizza ? 🍕');
  rewardGame({ id: 'recipe', activity: 'game_recipe', stars, hunger: 4 + Math.min(n, 8), happy: stars * 5, love: stars * 3, energy: -5, pers: 'food', persPts: 3, label: 'à la Recette à deux' });
  endGameLater(() => { recipeEl.hidden = true; }, 2600);
}

registerMini({ el: recipeEl, stop: () => { cookStop(); cook.phase = 'over'; } });
$('pickRecipe').addEventListener('click', () => { gamesModal.hidden = true; if (!canAct()) return toast('Attends la fin de sa visite 😍'); startRecipe(); });
