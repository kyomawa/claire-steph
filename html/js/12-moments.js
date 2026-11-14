// =====================================================================
//  Moments à deux + album
// =====================================================================
const MOMENTS = [
  { id: 'maison', n: 'Soirée canapé', d: { happy: 12, love: 14, energy: 4 }, cap: 'Soirée canapé tous les deux 🛋️', u: Lv(1), calm: true },
  { id: 'cafe', n: 'Pause café', d: { hunger: 10, energy: 12, love: 10, happy: 6 }, cap: 'Un petit café en terrasse ☕', u: Lv(1) },
  { id: 'lecture', n: 'Lecture à deux', d: { happy: 10, love: 10, energy: 6 }, cap: 'Chacun son livre, collés-serrés 📚', u: Lv(1), calm: true },
  { id: 'jeux', n: 'Soirée jeux vidéo', d: { happy: 20, love: 8, energy: -8, hunger: -6 }, cap: 'Allez, la revanche ! 🎮', u: Lv(2) },
  { id: 'cuisine', n: 'On cuisine', d: { hunger: 34, happy: 10, love: 10, energy: -4 }, cap: 'Petits plats faits maison 🍲', u: Lv(2) },
  { id: 'detente', n: 'Détente', d: { energy: 22, happy: 8, love: 8 }, cap: 'Poufs, plaids et zéro stress 😌', u: Lv(2), calm: true },
  { id: 'sport', n: 'Sport ensemble', d: { happy: 14, love: 8, energy: -16, hunger: -12 }, cap: 'On se motive à deux 💪', u: Lv(3), effort: true },
  { id: 'shopping', n: 'Shopping', d: { happy: 16, love: 6, energy: -10, hunger: -6 }, cap: 'Juste un dernier magasin… 🛍️', u: Lv(3), effort: true },
  { id: 'fete', n: 'Soirée dansante', d: { happy: 22, love: 12, energy: -18, hunger: -8 }, cap: "On danse jusqu'au bout de la nuit 🪩", u: Lv(4), effort: true },
  { id: 'voyage', n: 'Escapade', d: { happy: 26, love: 16, energy: -20, hunger: -10 }, cap: 'Valises prêtes, on part ! ✈️', u: Lv(5), effort: true },
  { id: 'plage', n: 'Journée plage', d: { happy: 22, love: 14, energy: -8 }, cap: 'Sable chaud et crème solaire 🏖️', u: Mo(6, 7, 8) },
  { id: 'hiver', n: 'Bonhomme de neige', d: { happy: 20, love: 12, energy: -12 }, cap: 'Un bonhomme de neige à deux ⛄', u: Mo(12, 1, 2), effort: true },
  // ceux-là arrivent tout seuls
  { id: 'amour', n: 'Gros câlin', auto: 'Faire un câlin' },
  { id: 'nuit', n: 'Dodo à deux', auto: 'Le coucher la nuit' },
  { id: 'soins', n: 'Prendre soin', auto: 'Le soigner quand il est malade' },
  { id: 'anniversaire', n: 'Jour de fête', auto: 'Un jour de fête' }
];
const MOMENT = Object.fromEntries(MOMENTS.map((m) => [m.id, m]));
const sceneOf = (id) => A['moment_' + id];

function addToAlbum(id) {
  const first = !state.album[id];
  if (first) state.album[id] = { since: dayKey(now()), n: 0 };
  state.album[id].n++;
  if (first) toast(`Nouveau moment dans l'album : ${MOMENT[id].n}`, sceneOf(id));
  checkTrophies();
}

function momentAvailability(m) {
  const u = m.u;
  if (u.type === 'level' && levelFor(state.xp) < u.n) return { ok: false, why: `🔒 Niveau ${u.n}` };
  if (u.type === 'season' && !u.months.includes(now().getMonth() + 1)) return { ok: false, why: '🔒 ' + unlockText(u) };
  if (state.sick && !m.calm) return { ok: false, why: '🤒 Il est malade' };
  if (m.effort && state.energy < 20) return { ok: false, why: '😪 Trop fatigué' };
  return { ok: true };
}

function deltaText(d) {
  const ico = { love: '💕', happy: '😊', energy: '⚡', hunger: '🍔' };
  return Object.entries(d).map(([k, v]) => `${ico[k]}${v > 0 ? '+' : ''}${v}`).join(' ');
}

const duo = $('duo');
function renderDuo() {
  $('duoGrid').replaceChildren(...MOMENTS.filter((m) => !m.auto).map((m) => {
    const av = momentAvailability(m);
    const b = el('button', 'm-card' + (av.ok ? '' : ' locked'));
    const img = el('img');
    img.src = sceneOf(m.id);
    img.alt = '';
    b.append(img, el('span', 'm-name', m.n), el('span', 'm-sub', av.ok ? deltaText(m.d) : av.why));
    b.disabled = !av.ok;
    b.addEventListener('click', () => { duo.hidden = true; doMoment(m); });
    return b;
  }));
}

function doMoment(m) {
  doAction({
    img: sceneOf(m.id), scene: true, caption: m.cap, delta: m.d, duration: 2800, xp: 6, counter: 'moments',
    cat: { sport: 'sport', fete: 'party', cuisine: 'food', jeux: 'geek' }[m.id] || 'love',
    weight: m.id === 'sport' ? -0.5 : (m.id === 'cuisine' ? 0.3 : 0),
    after: () => { addToAlbum(m.id); if (m.id === 'voyage') sendPostcard(); }
  });
}

$('btnDuo').addEventListener('click', () => {
  if (!canAct()) return;
  renderDuo();
  duo.hidden = false;
  $('duoClose').focus();
});
$('duoClose').addEventListener('click', () => { duo.hidden = true; });
duo.addEventListener('click', (e) => { if (e.target === duo) duo.hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') duo.hidden = true; });

// ---- Décor de fond ----
const DECORS = [
  { id: 'auto', n: 'Selon la saison' }, { id: 'none', n: 'Aucun' },
  { id: 'salon', n: 'Salon' }, { id: 'cuisine', n: 'Cuisine' }, { id: 'parc', n: 'Parc' },
  { id: 'ville', n: 'Ville' }, { id: 'plage', n: 'Plage' }, { id: 'neige', n: 'Neige' }
];
function currentDecor() {
  if (state.decor !== 'auto') return state.decor;
  const m = now().getMonth() + 1;
  if (m === 12 || m <= 2) return 'neige';
  if (m <= 5) return 'parc';
  if (m <= 8) return 'plage';
  return 'salon';
}
function applyDecor() {
  const d = currentDecor();
  const src = d === 'none' ? null : A['decor_' + d];
  const bd = $('backdrop');
  bd.hidden = !src;
  if (src && bd.getAttribute('src') !== src) bd.src = src;
  const pv = $('preview');
  pv.style.backgroundImage = src ? `url("${src}")` : '';
}
