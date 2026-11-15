// =====================================================================
//  Cycle de vie : boucle de jeu, événements du moteur, lumière, caprices,
//  personnalité, anti-farm, appels à l'attention, statut
//  (règles chiffrées : js/engine/sim.js — docs/GAME_DESIGN.md)
// =====================================================================
const TICK_MS = 5000;
let lastTickAt = Date.now();
let lastPersonality;

// ---- Personnalité / activités ----
function act(cat, pts) {
  Sim.addActivity(state, cat, pts);
  const p = Sim.personality(state);
  if (lastPersonality !== undefined && p && p !== lastPersonality) {
    const P = Sim.PERSONALITIES[p];
    toast(`${P.icon} Il devient ${P.name} !`);
    addMemory(`${P.icon} Il est devenu ${P.name}`, 'special');
    sfx.level();
  }
  lastPersonality = p;
}
const isPers = (p) => Sim.personality(state) === p;

// ---- Anti-farm des mini-jeux ----
function playMult(id) {
  const today = dayKey(now());
  if (!state.gamePlays || state.gamePlays.day !== today) state.gamePlays = { day: today, counts: {} };
  const n = (state.gamePlays.counts[id] || 0) + 1;
  state.gamePlays.counts[id] = n;
  const m = Sim.playMultiplier(n);
  if (m < 1 && (n === 4 || n === 7)) setTimeout(() => toast(`Gains réduits : ${n}ᵉ partie du jour (×${m})`), 600);
  return m;
}
const geekBonus = () => (isPers('geek') ? 2 : 0);

// ---- Événements du moteur ----
function handleSimEvents(events, offline) {
  let poops = 0;
  const mistakes = [];
  for (const e of events) {
    if (e.type === 'poop') poops++;
    else if (e.type === 'mistake') mistakes.push(e.key);
    else if (e.type === 'sick' && !offline) { showBubble('Je me sens pas bien... 🤒', 2600); sfx.bad(); }
    else if (e.type === 'alert' && !offline) {
      const def = Sim.ALERTS[e.key];
      if (e.key !== 'lights') showBubble(`${def.icon} ${def.label}…`, 2200);
      sfx.alert();
      buzz([40, 60, 40]);
    } else if ((e.type === 'wake' || e.type === 'sleep') && !offline) refreshHim(true);
  }
  if (poops) {
    renderPoops();
    if (!offline) { showBubble('Oups... 💩', 1800); sfx.pop(); }
  }
  if (mistakes.length && !offline) {
    const def = Sim.ALERTS[mistakes[0]];
    toast(`Soin oublié : ${def.icon} ${def.label}`);
  }
  return { poops, mistakes };
}

// ---- La boucle ----
function tick() {
  try { tickInner(); } catch (e) { if (typeof logError === 'function') logError('tick : ' + e.message); }
}
function tickInner() {
  const t = Date.now();
  applyPhase();
  if (busy || game.active) return;            // le temps est rattrapé au tick suivant
  const events = Sim.simulate(state, lastTickAt, t, { hourOf: hourOfTs });
  lastTickAt = t;
  handleSimEvents(events, false);
  updateConditions();
  renderStats();
  refreshHim();
  checkWish();
  maybeWish();
  maybeAsk();
  maybeCaprice();

  if (himMode() !== 'normal' || bubbleEl.classList.contains('show')) return;
  const hh = hourOfTs(t);
  if (hh >= 21.75 && hh < 22.5 && state.lights && !tick.bedHint) { tick.bedHint = true; showBubble('Bientôt dodo… tu me couches ? 🌙 (bouton Dodo)', 3000); return; }
  if (state.hunger < 25 && Math.random() < 0.3) showBubble("J'ai faim... 🍔", 2000);
  else if (state.energy < 20 && Math.random() < 0.3) showBubble('Fatigué... 😪', 2000);
  else if (state.love < 30 && Math.random() < 0.3) showBubble('Tu me manques... 💌', 2200);
  else if (state.weight > 80 && Math.random() < 0.05) showBubble('Je me sens un peu lourd… 🏃 ?', 2200);
}

// ---- Lumière ----
function toggleLights() {
  state.lights = !state.lights;
  sfx.tap();
  showBubble(state.lights ? 'Hein ? Qui a allumé ? 😵' : 'Bonne nuit… 💤', 1600);
  renderStats();
  saveState();
}

// ---- Caprices (sagesse) ----
const CAPRICES = [
  'Je veux un poney ! 🐴', 'Achète-moi une Ferrari 🏎️', 'Je veux du gâteau au petit-déj 🍰',
  'Je veux pas ranger ! 🙅', 'Encore 5 minutes de jeu vidéo 🎮', 'Je veux un deuxième dessert 🍨',
  'Porte-moi, j’ai la flemme 🛋️', 'On adopte un chat ? Maintenant ! 🐈'
];
const capriceEl = $('caprice');
let caprice = null;

function maybeCaprice() {
  if (caprice || !askEl.hidden || wish || busy || himMode() !== 'normal' || Sim.activeAlerts(state).length) return;
  const today = dayKey(now());
  if (!state.capriceDay || state.capriceDay.day !== today) state.capriceDay = { day: today, n: 0 };
  const max = state.discipline < 30 ? 3 : 2;
  if (state.capriceDay.n >= max) return;
  const p = state.discipline < 30 ? 0.006 : 0.003;
  if (Math.random() > p) return;
  state.capriceDay.n++;
  caprice = { text: pick(CAPRICES), at: Date.now() };
  $('capriceText').textContent = caprice.text;
  capriceEl.hidden = false;
  sfx.alert();
}

function endCaprice(give) {
  if (!caprice) return;
  capriceEl.hidden = true;
  caprice = null;
  const before = snap();
  if (give) {
    state.happy = clamp(state.happy + 6);
    state.discipline = Math.max(0, state.discipline - 8);
    showBubble(pick(['Ouiii, merci ! 😁', 'T’es la meilleure 🥳', 'Hihi, j’ai gagné 😏']), 1800);
    sfx.happy();
  } else {
    state.happy = clamp(state.happy - 3);
    state.discipline = Math.min(100, state.discipline + 10);
    gainXp(3);
    showBubble(pick(['Bon… t’as raison 😔', 'D’accord, d’accord… 🙄', 'Mouais. Je suis sage. 😇']), 1800);
    sfx.tap();
  }
  renderStats();
  showDeltas(before);
}
$('capriceGive').addEventListener('click', (e) => { e.stopPropagation(); endCaprice(true); });
$('capriceNo').addEventListener('click', (e) => { e.stopPropagation(); endCaprice(false); });

// ---- Rendu : lumière, appels, jauges critiques ----
// pendant un mini-jeu ou une scène, les cartes (question, caprice, alerte) s'effacent
function syncOverlays() {
  screenEl.classList.toggle('in-game', busy || game.active);
}

function renderLife() {
  const asleep = himMode() === 'sleep';
  Sim.clearResolved(state, asleep);
  spriteEl.classList.toggle('sad', !asleep && (state.sick || state.sulk || state.happy < 30));
  screenEl.classList.toggle('lights-off', asleep && !state.lights);
  screenEl.classList.toggle('lights-on-night', asleep && state.lights);
  const sb = $('btnSleep');
  const label = asleep ? (state.lights ? ['💡', 'Éteindre'] : ['🔆', 'Allumer']) : ['😴', 'Dodo'];
  if (sb.dataset.label !== label[1]) {
    sb.dataset.label = label[1];
    sb.replaceChildren(el('span', 'emoji', label[0]), document.createTextNode(label[1]));
  }
  sb.classList.toggle('alert', asleep && state.lights);
  const alerts = Sim.activeAlerts(state);
  const badge = $('alertBadge');
  badge.hidden = !alerts.length;
  if (alerts.length) badge.textContent = alerts.length > 1 ? `⚠️${alerts.length}` : `⚠️`;
  for (const k of ['hunger', 'energy', 'happy', 'love']) $('bar-' + k).parentElement.classList.toggle('critical', state[k] < 15);
}

// ---- Fenêtre « Statut » (façon tamagotchi) ----
const statusModal = $('statusModal');
function weightLabel(w) { return w > 80 ? 'un peu rond' : (w < 62 ? 'trop mince' : 'en forme'); }

function renderStatus() {
  const nowMs = Date.now();
  const pk = Sim.personality(state);
  const P = pk ? Sim.PERSONALITIES[pk] : null;
  const bond = Sim.bond(state, nowMs);
  const recent = state.mistakes.filter((m) => nowMs - m.t < 7 * DAY_MS).length;
  const alerts = Sim.activeAlerts(state);
  const rows = [
    ['🎂 Âge', `${daysTogether()} jour${daysTogether() > 1 ? 's' : ''}`],
    ['⚖️ Poids', `${state.weight.toFixed(1)} kg · ${weightLabel(state.weight)}`],
    ['🧬 Personnalité', P ? `${P.icon} ${P.name}` : 'Se découvre encore…'],
    ['🏁 Rang', `${rankFor(levelFor(state.xp))} (niv. ${levelFor(state.xp)})`],
    ['💞 Complicité', '★'.repeat(bond) + '☆'.repeat(5 - bond)],
    ['📋 Soins oubliés (7 j)', String(recent)],
    ['🔥 Série', `${state.streak} jour${state.streak > 1 ? 's' : ''} · demain +${Career.streakReward(state.streak + 1)} ⛽`],
    ['🌙 Horaires', 'dodo 22 h 30 · réveil 7 h 30']
  ];
  const t = el('table', 'stat-table');
  for (const [k, v] of rows) { const tr = el('tr'); tr.append(el('td', '', k), el('td', '', v)); t.appendChild(tr); }
  const wis = el('div', 'wisdom');
  const bar = el('div', 'd-bar');
  const fill = el('div', 'd-fill');
  fill.style.width = state.discipline + '%';
  bar.appendChild(fill);
  wis.append(el('div', 'd-title', `🎓 Sagesse : ${Math.round(state.discipline)} / 100`), bar);
  const al = el('div', 'alerts-list');
  if (!alerts.length && !(typeof needsNow === 'function' && needsNow().length)) al.appendChild(el('p', 'ok-line', '✅ Tout va bien, rien à faire pour l’instant'));
  for (const k of alerts) {
    const def = Sim.ALERTS[k];
    const mins = Math.floor((nowMs - state.alerts[k].since) / 60000);
    al.appendChild(el('p', 'alert-line', `${def.icon} ${def.label} · depuis ${mins} min${state.alerts[k].counted ? ' (soin oublié)' : ''}`));
  }
  if (typeof todoRow === 'function') {
    const row = todoRow(() => { statusModal.hidden = true; });
    if (row) al.append(el('p', 'away-h', 'À faire maintenant :'), row);
  }
  const wk = el('button', 'btn wide-btn', '📈 Voir son bien-être de la semaine');
  wk.addEventListener('click', () => { statusModal.hidden = true; openWeek(false); });
  $('statusBody').replaceChildren(al, t, wis, wk);
}

function openStatus() { renderStatus(); statusModal.hidden = false; sfx.tap(); }
$('alertBadge').addEventListener('click', (e) => { e.stopPropagation(); openStatus(); });
$('statusClose').addEventListener('click', () => { statusModal.hidden = true; });
statusModal.addEventListener('click', (e) => { if (e.target === statusModal) statusModal.hidden = true; });
