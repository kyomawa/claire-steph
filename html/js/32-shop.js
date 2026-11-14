// =====================================================================
//  Jetons ⛽ + boutique
// =====================================================================
function earn(n, why) {
  if (!n) return;
  state.tokens = (state.tokens || 0) + n;
  renderTokens();
  if (why) setTimeout(() => toast(`+${n} ⛽ ${why}`), 300);
}
function renderTokens() { $('hudTokens').textContent = `⛽ ${state.tokens || 0}`; }

const TREATS = [
  { id: 'cake', n: 'Part de gâteau', drag: '🍰', price: 15, d: { hunger: 20, happy: 26 }, cap: 'Un gâteau rien que pour moi ?! 🍰' },
  { id: 'sushi', n: 'Plateau sushi', drag: '🍣', price: 12, d: { hunger: 32, happy: 14 }, cap: 'Sushi time ! 🍣' },
  { id: 'icecream', n: 'Glace', drag: '🍦', price: 8, d: { hunger: 8, happy: 16, energy: 4 }, cap: 'Une glace, la vie est belle 🍦' },
  { id: 'fries', n: 'Frites', drag: '🍟', price: 6, d: { hunger: 18, happy: 10, energy: -2 }, cap: 'Des frites !!! 🍟' },
  { id: 'strawberry', n: 'Fraises', drag: '🍓', price: 5, d: { hunger: 8, happy: 8, energy: 6 }, cap: 'Fraises toutes fraîches 🍓' },
  { id: 'energy', n: 'Boisson énergie', drag: '🧃', price: 10, d: { energy: 30, happy: 4 }, cap: 'Plein d’énergie ! ⚡' }
];
const shopModal = $('shop');
let shopTab = 'treats';

function accessoryPrice(it) { return it.u.type === 'level' ? 25 * it.u.n : null; }

function renderShop() {
  $('shopBalance').textContent = `Tu as ${state.tokens || 0} ⛽ · gagne-en avec les mini-jeux, les défis et ses envies`;
  document.querySelectorAll('#shop .tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.shop === shopTab)));
  const grid = $('shopGrid');
  if (shopTab === 'treats') {
    grid.replaceChildren(...TREATS.map((t) => {
      const b = el('button', 'm-card f-card shop-card' + ((state.tokens || 0) < t.price ? ' locked' : ''));
      b.append(el('span', 'shop-emoji', t.drag), el('span', 'm-name', t.n), el('span', 'm-sub', deltaText(t.d)), el('span', 'price', `${t.price} ⛽`));
      b.disabled = (state.tokens || 0) < t.price;
      b.addEventListener('click', () => buyTreat(t));
      return b;
    }));
  } else {
    const list = ITEMS.filter((it) => !state.owned[it.id] && accessoryPrice(it));
    if (!list.length) { grid.replaceChildren(el('p', 'empty', 'Tous les accessoires à acheter sont déjà à lui 🎉')); return; }
    grid.replaceChildren(...list.map((it) => {
      const price = accessoryPrice(it);
      const b = el('button', 'm-card f-card shop-card' + ((state.tokens || 0) < price ? ' locked' : ''));
      const img = el('img');
      img.src = A[it.id];
      img.alt = '';
      b.append(img, el('span', 'm-name', it.n), el('span', 'm-sub', `sinon au niveau ${it.u.n}`), el('span', 'price', `${price} ⛽`));
      b.disabled = (state.tokens || 0) < price;
      b.addEventListener('click', () => buyItem(it, price));
      return b;
    }));
  }
}

function buyTreat(t) {
  if ((state.tokens || 0) < t.price) return;
  if (state.hunger > 92 && t.d.hunger > 10) { shopModal.hidden = true; return feed(t); }
  state.tokens -= t.price;
  state.counters.purchases++;
  renderTokens();
  saveState();
  shopModal.hidden = true;
  sfx.coin();
  spawnFood({ ...t, img: () => null });
}

function buyItem(it, price) {
  if ((state.tokens || 0) < price) return;
  state.tokens -= price;
  state.counters.purchases++;
  state.owned[it.id] = dayKey(now());
  renderTokens();
  saveState();
  sfx.coin();
  toast(`Nouveau dans la garde-robe : ${it.n}`, A[it.id]);
  checkTrophies();
  renderShop();
}

$('hudTokens').addEventListener('click', () => { renderShop(); shopModal.hidden = false; });
$('shopClose').addEventListener('click', () => { shopModal.hidden = true; });
shopModal.addEventListener('click', (e) => { if (e.target === shopModal) shopModal.hidden = true; });
document.querySelectorAll('#shop .tab').forEach((t) => t.addEventListener('click', () => { shopTab = t.dataset.shop; renderShop(); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') shopModal.hidden = true; });
