// =====================================================================
//  Repas au choix (+ son plat préféré du jour)
// =====================================================================
const MENU = [
  { id: 'cafe', n: 'Café', drag: '☕', img: () => A.coffeeBig, d: { hunger: 12, energy: 16, happy: 6 }, cap: 'Merci pour le café ☕' },
  { id: 'pizza', n: 'Pizza', drag: 'foodPizza', img: () => A.foodPizza, d: { hunger: 28, happy: 14, energy: -2 }, cap: 'Une part de pizza, miam ! 🍕' },
  { id: 'burger', n: 'Burger', drag: 'foodBurger', img: () => A.foodBurger, d: { hunger: 30, happy: 10, energy: -2 }, cap: 'Un bon gros burger ! 🍔' },
  { id: 'poulet', n: 'Poulet', drag: 'foodDrumstick', img: () => A.foodDrumstick, d: { hunger: 26, happy: 8, energy: 2 }, cap: 'Ça creuse, ce poulet ! 🍗' },
  { id: 'smoothie', n: 'Smoothie', drag: '🥤', img: () => A.himDrink, d: { hunger: 10, energy: 12, happy: 6 }, cap: 'Un smoothie bien frais 🥤' },
  { id: 'eau', n: "Verre d'eau", drag: 'foodWater', img: () => A.foodWater, d: { hunger: 4, energy: 10, happy: 2 }, cap: "Un grand verre d'eau 💧" }
];
const favoriteFood = () => MENU[Math.floor(new Date(dayKey(now())).getTime() / DAY_MS) % (MENU.length - 1)]; // jamais l'eau
const foodModal = $('food');

function renderFood() {
  const fav = favoriteFood();
  $('foodHint').textContent = state.hunger > 92 ? "Il n'a plus faim du tout 🤢" : `Aujourd'hui, il rêve de : ${fav.n} ❤️`;
  $('foodGrid').replaceChildren(...MENU.map((f) => {
    const b = el('button', 'm-card f-card' + (f === fav ? ' fav' : ''));
    const img = el('img');
    img.src = f.img();
    img.alt = '';
    b.append(img, el('span', 'm-name', (f === fav ? '❤️ ' : '') + f.n), el('span', 'm-sub', deltaText(f.d)));
    b.addEventListener('click', () => {
      foodModal.hidden = true;
      if (state.hunger > 92) return feed(f);
      spawnFood(f);
    });
    return b;
  }));
}

function feed(f) {
  if (state.hunger > 92) {
    state.happy = clamp(state.happy - 2);
    renderStats();
    sfx.bad();
    return refuse(pick(["J'ai plus faim 🤢", 'Encore ?! Je vais exploser 🎈', 'Non merci, je suis plein 😵']));
  }
  const fav = f === favoriteFood();
  const d = { ...f.d };
  if (fav) d.happy = (d.happy || 0) + 10;
  doAction({ img: f.img(), emoji: f.drag, caption: fav ? `${f.n} ?! Mon préféré 😍` : f.cap, delta: d, duration: 1600, xp: fav ? 5 : 3, counter: 'meals' });
}

$('foodClose').addEventListener('click', () => { foodModal.hidden = true; });
foodModal.addEventListener('click', (e) => { if (e.target === foodModal) foodModal.hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') foodModal.hidden = true; });
