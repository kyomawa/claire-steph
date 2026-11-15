// =====================================================================
//  Clarté : ce dont il a besoin, où on en est, ce qui s'est passé
// =====================================================================

// ---- Pastilles sur les boutons : ce dont il a besoin maintenant ----
// orange = conseillé, rouge qui pulse = il t'appelle (soin oublié dans 45 min)
const NEEDS = [
  { btn: 'btnHeal', alert: 'sick', label: '💊 Soigner', soft: () => !!state.sick },
  { btn: 'btnCoffee', alert: 'hunger', label: '🍽️ Manger', soft: (z) => !z && state.hunger < 35 },
  { btn: 'btnWash', alert: 'dirty', label: '🧼 Laver', soft: () => state.poops.length > 0 },
  { btn: 'btnSleep', alert: 'lights', label: '😴 Dodo', soft: (z) => !z && state.energy < 25 },
  { btn: 'btnHug', alert: 'love', label: '🥰 Câlin', soft: (z) => !z && state.love < 35 },
  { btn: 'btnGame', alert: 'happy', label: '🎮 Jouer', soft: (z) => !z && state.happy < 35 && !state.sick && state.energy >= 15 }
];
function needsNow() {
  const asleep = himMode() === 'sleep';
  const out = [];
  for (const n of NEEDS) {
    const urgent = !!(state.alerts && state.alerts[n.alert]);
    if (urgent || n.soft(asleep)) out.push({ ...n, urgent, label: n.alert === 'lights' && urgent ? '💡 Éteindre' : n.label });
  }
  return out.sort((a, b) => b.urgent - a.urgent);
}
function renderNeeds() {
  const list = needsNow();
  for (const n of NEEDS) {
    const hit = list.find((x) => x.btn === n.btn);
    const b = $(n.btn);
    b.classList.toggle('need', !!hit);
    b.classList.toggle('need-urgent', !!(hit && hit.urgent));
  }
  if (typeof renderButtonsState === 'function') renderButtonsState();
  if (typeof renderStatusLine === 'function') renderStatusLine();
}

// ---- Boutons : ce qu'ils font (appui long), grisés quand c'est impossible ----
const BTN_INFO = {
  btnCoffee: ['🍽️ Manger', 'Choisis un plat : Faim ↑ (café et smoothie : Énergie ↑ aussi)', 'Les plats copieux font prendre un peu de poids', 'Un caca arrive 1 à 2 h après le repas'],
  btnRun: ['🏃 Courir', 'Bonheur +22 · Énergie −12 · Faim −14', 'Poids −0,5 kg · entraîne l’endurance'],
  btnCode: ['💻 Coder', 'Énergie −10 à −14 · Faim −6', 'Bonheur selon le résultat : bug 😩 ou tests verts ✅', 'Entraîne le code'],
  btnSleep: ['😴 Dodo', 'Le jour : une sieste, Énergie +32', 'Dès 21 h : au lit, lumière éteinte', 'Quand il dort : allume ou éteint la lumière'],
  btnGame: ['🎮 Jouer', '8 mini-jeux : Bonheur et Amour ↑, Énergie ↓', 'Chacun entraîne une compétence de pilote'],
  btnWash: ['🧼 Laver', 'Ramasse tous les cacas + petite douche', 'Bonheur +8, et +4 par caca'],
  btnHeal: ['💊 Soigner', 'Seulement quand il est malade 🤒', 'Le guérit et remonte ses jauges', 'Avec peu de sagesse 🎓, il peut refuser'],
  btnBook: ['📖 Carnet', 'Vos souvenirs, ses trophées et ses statistiques'],
  btnStyle: ['👕 Garde-robe', 'Accessoires, compagnon et décor', 'De nouveaux arrivent avec les niveaux, les trophées et les saisons'],
  btnDuo: ['💑 À deux', 'Des moments à deux : Amour et Bonheur ↑', 'Et les mots doux vers l’autre téléphone'],
  btnHug: ['🥰 Câlin de ta copine', 'Tu viens le câliner : Amour +26 · Bonheur +18', 'Entraîne le charme']
};
// pourquoi un bouton ne peut pas servir maintenant (mêmes règles que les boutons eux-mêmes)
function offReason(id) {
  if (id === 'btnRun') return state.sick ? 'Trop malade pour courir' : (state.energy < 10 ? 'Trop fatigué pour courir' : null);
  if (id === 'btnCode') return state.sick ? 'Pas de code quand il est malade' : null;
  if (id === 'btnGame') return state.sick ? 'Trop malade pour jouer' : (state.energy < 15 ? 'Trop fatigué pour jouer' : null);
  if (id === 'btnHeal') return state.sick ? null : 'Il n’est pas malade';
  if (id === 'btnCoffee') return state.hunger > 92 ? 'Il n’a plus faim' : null;
  return null;
}
function btnTip(id) {
  const why = offReason(id);
  return [...BTN_INFO[id], why ? `⛔ Pour l’instant : ${why}` : null];
}
function renderButtonsState() {
  for (const id of Object.keys(BTN_INFO)) {
    const b = $(id);
    const why = offReason(id);
    b.classList.toggle('off', !!why);
    const title = why ? `${BTN_INFO[id][0]} : ${why}` : BTN_INFO[id].join(' · ');
    if (b.title !== title) b.title = title;
  }
}
// appui long sur un bouton : l'explication, sans déclencher l'action
const btnBox = document.querySelector('.buttons');
const press = { timer: 0, shown: false, x: 0, y: 0 };
btnBox.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn');
  press.shown = false;
  clearTimeout(press.timer);
  if (!b || !BTN_INFO[b.id]) return;
  press.x = e.clientX;
  press.y = e.clientY;
  press.timer = setTimeout(() => { press.shown = true; showHudTip(b, btnTip(b.id)); buzz(15); }, 550);
});
const cancelPress = () => clearTimeout(press.timer);
btnBox.addEventListener('pointerup', cancelPress);
btnBox.addEventListener('pointercancel', cancelPress);
btnBox.addEventListener('pointerleave', cancelPress);
btnBox.addEventListener('pointermove', (e) => { if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) cancelPress(); });
btnBox.addEventListener('click', (e) => {
  if (!press.shown) return;
  press.shown = false;
  e.stopImmediatePropagation();
  e.preventDefault();
}, true);
btnBox.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- Jauges : leur chiffre, et ce qu'elles veulent dire au toucher ----
const GAUGE_INFO = {
  hunger: { ico: '🍔', n: 'Faim', full: 'Barre pleine = ventre plein', how: '🍽️ Manger', alert: 'Sous 15, il a faim et t’appelle' },
  energy: { ico: '⚡', n: 'Énergie', full: 'Barre pleine = en pleine forme', how: '😴 Dodo, ☕ café, 🥤 smoothie', alert: 'Il récupère en dormant (moitié moins lumière allumée)' },
  happy: { ico: '😊', n: 'Bonheur', full: 'Barre pleine = aux anges', how: '🎮 Jouer, 🏃 Courir, bisous, chatouilles', alert: 'Chaque caca laissé par terre le rend triste' },
  love: { ico: '💗', n: 'Amour', full: 'Barre pleine = comblé', how: '🥰 Câlin, 💑 À deux, caresses, mots doux', alert: 'Sous 20, il boude (jusqu’à 35)' }
};
const gaugeWord = (v) => (v >= 70 ? 'au top' : (v >= 40 ? 'ça va' : (v >= 15 ? 'bas' : 'très bas !')));
const frNum = (x) => String(x).replace('.', ',');
function gaugeTip(k) {
  const g = GAUGE_INFO[k];
  const v = Math.round(state[k]);
  const night = Sim.RULES.asleep[k];
  return [
    `${g.ico} ${g.n} : ${v} / 100 · ${gaugeWord(v)}`,
    g.full,
    `Baisse d’environ ${frNum(Math.abs(Sim.RULES.awake[k]))} par heure éveillé (${night > 0 ? '+' + frNum(night) + ' par heure en dormant' : frNum(Math.abs(night)) + ' la nuit'})`,
    `Remonte avec ${g.how}`,
    g.alert
  ];
}
function renderGaugeValues() {
  for (const k of Object.keys(GAUGE_INFO)) {
    const v = $('val-' + k);
    const n = String(Math.round(state[k]));
    if (v.textContent !== n) v.textContent = n;
    v.classList.toggle('low', state[k] < 15);
  }
}
document.querySelectorAll('.stat-row[data-gauge]').forEach((row) => {
  const open = (e) => { e.stopPropagation(); showHudTip(row, gaugeTip(row.dataset.gauge)); };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } });
});

// ---- La phrase du moment, sous le titre : ce qu'il vit et ce qu'il lui faut ----
const fmtHour = (h) => `${Math.floor(h)} h${h % 1 ? ' ' + String(Math.round((h % 1) * 60)).padStart(2, '0') : ''}`;
const TIPS_OK = ['💕 Tout va bien · tape-le pour un bisou', '🤲 Frotte-le du doigt : des caresses', '😂 Tape 3 fois vite : chatouilles', '🫂 Reste appuyé sur lui : un câlin', '👆 Tape par terre : il y va'];
const URGENT_TXT = { hunger: ['🍔 Il a faim', 'btnCoffee', '🍽️ Manger'], dirty: ['💩 C’est sale', 'btnWash', '🧼 Laver'], love: ['💌 Tu lui manques', 'btnHug', '🥰 Câlin'], happy: ['😢 Il est triste', 'btnGame', '🎮 Jouer'] };
const SOFT_TXT = { btnCoffee: '🍔 Il commence à avoir faim → 🍽️ Manger', btnWash: '💩 Un caca à ramasser → tape dessus', btnSleep: '🥱 Il est fatigué → 😴 Dodo', btnHug: '🥺 Un câlin lui ferait du bien → 🥰', btnGame: '🙁 Il s’ennuie → 🎮 Jouer' };
function statusNow() {
  if (game.active) return { t: '🎮 Partie en cours · ✕ Quitter sous l’écran', lvl: 'ok' };
  if (girlBusy) return { t: '💕 Elle est là ! Profite du moment', lvl: 'ok' };
  const mode = himMode();
  const alerts = state.alerts || {};
  if (state.sick) return { t: '🤒 Il est malade → 💊 Soigner', lvl: 'urgent', btn: 'btnHeal' };
  if (mode === 'sleep') {
    if (state.lights !== false) return { t: '💡 Il dort lumière allumée → éteins (Dodo)', lvl: alerts.lights ? 'urgent' : 'soft', btn: 'btnSleep' };
    return { t: `😴 Il dort · réveil vers ${fmtHour(Sim.RULES.wakeup)}`, lvl: 'sleep' };
  }
  for (const k of Object.keys(URGENT_TXT)) {
    if (!alerts[k]) continue;
    const [txt, btn, what] = URGENT_TXT[k];
    const mins = Math.max(0, Math.floor((Date.now() - alerts[k].since) / 60000));
    return { t: `${txt}${mins ? ` depuis ${mins} min` : ''} → ${what}`, lvl: 'urgent', btn };
  }
  if (state.sulk) return { t: '😤 Il boude → un câlin pour vous réconcilier', lvl: 'soft', btn: 'btnHug' };
  if (caprice) return { t: '😤 Un caprice : céder ou lui expliquer ?', lvl: 'soft' };
  if (!$('ask').hidden) return { t: '💬 Question du jour : réponds sur l’écran', lvl: 'ok' };
  const soft = needsNow().filter((n) => !n.urgent && SOFT_TXT[n.btn]);
  if (soft.length) return { t: SOFT_TXT[soft[0].btn], lvl: 'soft', btn: soft[0].btn };
  if (isNight() && state.awakeUntil > Date.now()) return { t: '😪 Réveillé en pleine nuit… il se rendort vite', lvl: 'soft' };
  if (wish) return { t: `💭 Il a une envie : ${wish.e} (touche sa bulle)`, lvl: 'soft' };
  const h = now().getHours() + now().getMinutes() / 60;
  if (h >= 21 && h < Sim.RULES.bedtime) return { t: '🌙 Bientôt l’heure du dodo → 😴 Dodo', lvl: 'ok', btn: 'btnSleep' };
  const gp = gpStatus();
  if (!gp.done && !gp.why) return { t: `🏁 GP de ${gp.circuit.name}${gp.weather === 'pluie' ? ' (☔)' : ''} ouvert → touche son n° ${$('raceNo').textContent}`, lvl: 'ok', btn: 'raceNo' };
  if (state.daily && !state.daily.all) {
    const d = state.daily.picks.filter((id) => state.daily.done[id]).length;
    return { t: `🎯 Défis du jour : ${d}/${state.daily.picks.length} → touche 🎯`, lvl: 'ok', btn: 'hudDaily' };
  }
  return { t: TIPS_OK[Math.floor(Date.now() / 12000) % TIPS_OK.length], lvl: 'ok' };
}
let statusKey = '';
function renderStatusLine() {
  const s = statusNow();
  const key = `${s.lvl}|${s.t}|${s.btn || ''}`;
  if (key === statusKey) return;
  statusKey = key;
  const span = $('statusText');
  span.textContent = s.t;
  span.className = 'lvl-' + s.lvl;
  $('statusLine').dataset.btn = s.btn || '';
}
// toucher la phrase : le bon bouton clignote (sinon, la fiche de statut)
$('statusLine').addEventListener('click', (e) => {
  e.stopPropagation();
  const target = $('statusLine').dataset.btn && $($('statusLine').dataset.btn);
  if (!target) { openStatus(); return; }
  try { target.scrollIntoView({ block: 'nearest', behavior: state.reduceMotion ? 'auto' : 'smooth' }); } catch (err) { /* ignoré */ }
  target.classList.remove('flash-hint');
  void target.offsetWidth;
  target.classList.add('flash-hint');
  setTimeout(() => target.classList.remove('flash-hint'), 1700);
  sfx.tap();
});
setInterval(guard(() => { renderGaugeValues(); renderNeeds(); }, 'phrase du moment'), 1500);

// actions conseillées en un toucher (résumé d'absence, fiche de statut)
function todoRow(onPick) {
  const todo = needsNow();
  if (!todo.length) return null;
  const row = el('div', 'away-actions');
  for (const n of todo.slice(0, 3)) {
    const b = el('button', 'chip away-chip' + (n.urgent ? ' urgent' : ''), n.label);
    b.addEventListener('click', () => { onPick(); setTimeout(() => $(n.btn).click(), 120); });
    row.appendChild(b);
  }
  return row;
}

// ---- Bulle d'explication des pastilles du haut (🗓️ ⭐ 🔥) ----
const hudTip = $('hudTip');
let hudTipTimer = 0;
function showHudTip(anchor, lines) {
  hudTip.textContent = lines.filter(Boolean).join('\n');
  hudTip.hidden = false;
  const r = anchor.getBoundingClientRect(), d = document.querySelector('.device').getBoundingClientRect();
  const w = hudTip.offsetWidth;
  const center = r.left - d.left + r.width / 2;
  const left = Math.max(8, Math.min(d.width - w - 8, center - w / 2));
  hudTip.style.left = left + 'px';
  hudTip.style.top = (r.bottom - d.top + 9) + 'px';
  hudTip.style.setProperty('--arrow-x', Math.max(14, Math.min(w - 14, center - left)) + 'px');
  clearTimeout(hudTipTimer);
  hudTipTimer = setTimeout(() => { hudTip.hidden = true; }, 6000);
  sfx.tap();
}
function daysTip() {
  const d = daysTogether();
  if (CONFIG.coupleStart) return [`💑 ${d.toLocaleString('fr-FR')} jours ensemble`, 'Chaque jour compte 💕'];
  return [`🗓️ Jour ${d} de ton Chéri-o-tchi`, `Arrivé le ${formatDate(dayKey(new Date(state.bornAt)))}`, 'Viens chaque jour : la série 🔥 rapporte des jetons'];
}
function levelTip() {
  const lvl = levelFor(state.xp);
  const next = ITEMS.filter((it) => it.u.type === 'level' && it.u.n === lvl + 1).map((it) => it.n);
  if (rankFor(lvl + 1) !== rankFor(lvl)) next.unshift(`rang « ${rankFor(lvl + 1)} »`);
  return [
    `⭐ Niveau ${lvl} · ${rankFor(lvl)}`,
    `Encore ${xpFloor(lvl + 1) - state.xp} XP pour le niveau ${lvl + 1}`,
    next.length ? `Au niveau ${lvl + 1} : ${next.join(', ')}` : null,
    'L’XP se gagne en prenant soin de lui, aux jeux et aux défis'
  ];
}
function streakTip() {
  const s = Math.max(1, state.streak);
  const pos = ((s - 1) % 7) + 1;       // 1 → 7
  return [
    `🔥 ${s} jour${s > 1 ? 's' : ''} d’affilée`,
    `Demain : +${Career.streakReward(s + 1)} ⛽`,
    pos === 7 ? 'Aujourd’hui : le gros bonus de 40 ⛽ 🎁' : `Gros bonus de 40 ⛽ dans ${7 - pos} jour${7 - pos > 1 ? 's' : ''}`,
    'Un jour sans venir et la série repart à 1'
  ];
}
for (const [id, fn] of [['hudDays', daysTip], ['hudLevel', levelTip], ['hudStreak', streakTip]]) {
  const chip = $(id);
  chip.setAttribute('role', 'button');
  chip.tabIndex = 0;
  chip.classList.add('tappable');
  const open = (e) => { e.stopPropagation(); showHudTip(chip, fn()); };
  chip.addEventListener('click', open);
  chip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } });
}
document.querySelector('.xp-track').addEventListener('click', (e) => { e.stopPropagation(); showHudTip($('hudLevel'), levelTip()); });
document.addEventListener('pointerdown', (e) => { if (!hudTip.hidden && !e.target.closest('.hud')) hudTip.hidden = true; }, true);

// ---- Choix du jeu : compétence entraînée, gains du jour, nouveautés ----
const GAME_CARDS = [
  { btn: 'pickCatch', id: 'catch', act: 'game_catch' },
  { btn: 'pickMemory', id: 'memory', act: 'game_memory' },
  { btn: 'pickDance', id: 'dance', act: 'game_dance' },
  { btn: 'pickRace', id: 'race', act: 'game_race' },
  { btn: 'pickGuess', id: 'guess', act: 'game_guess' },
  { btn: 'pickBugs', id: 'bugs', act: 'game_bugs', best: 'bestBugsTxt', fresh: () => !state.bestBugs, rec: () => `Record : ${state.bestBugs} pts` },
  { btn: 'pickRecipe', id: 'recipe', act: 'game_recipe', best: 'bestRecipeTxt', fresh: () => !state.bestRecipe, rec: () => `Record : ${state.bestRecipe} plat${state.bestRecipe > 1 ? 's' : ''}` },
  { btn: 'pickLights', id: 'lights', act: 'game_lights', best: 'bestLightsTxt', fresh: () => !state.bestLights, rec: () => `Record : ${fmtSec(state.bestLights)}` }
];
function renderGamesMeta() {
  const today = dayKey(now());
  const counts = state.gamePlays && state.gamePlays.day === today ? state.gamePlays.counts : {};
  for (const g of GAME_CARDS) {
    const b = $(g.btn);
    if (g.best) $(g.best).textContent = g.fresh() ? 'Pas encore joué' : g.rec();
    let meta = b.querySelector('.g-meta');
    if (!meta) { meta = el('span', 'g-meta'); b.appendChild(meta); }
    const tags = Object.keys(Career.TRAINING[g.act] || {}).map((k) => el('span', 'g-skill', `${Career.SKILLS[k].icon} ${Career.SKILLS[k].name}`));
    const m = Sim.playMultiplier((counts[g.id] || 0) + 1);
    if (m < 1) tags.push(el('span', 'g-tired', `gains ×${String(m).replace('.', ',')} aujourd’hui`));
    meta.replaceChildren(...tags);
    b.classList.toggle('is-new', !!(g.fresh && g.fresh()));
  }
  $('gamesNote').textContent = 'Chaque jeu entraîne une compétence de pilote 🏁 · gains complets pour les 3 premières parties de chaque jeu, chaque jour';
}

// ---- Pendant ton absence : ce qui s'est passé, et quoi faire ----
const awayModal = $('awayModal');
const GAUGES = [['hunger', '🍔', 'Faim'], ['energy', '⚡', 'Énergie'], ['happy', '😊', 'Bonheur'], ['love', '💗', 'Amour']];
function openAway(hours, events, before) {
  const h = Math.round(hours);
  const absent = h >= 24 ? `${Math.round(h / 24)} jour${h >= 36 ? 's' : ''}` : `${h} h`;
  const count = (type) => events.filter((e) => e.type === type).length;
  const lines = [];
  const slept = count('sleep'), woke = count('wake');
  if (slept && woke) lines.push('😴 Il a dormi, puis s’est réveillé');
  else if (slept) lines.push('😴 Il s’est endormi');
  else if (woke) lines.push('☀️ Il s’est réveillé');
  if (state.poops.length) lines.push(`💩 ${state.poops.length} caca${state.poops.length > 1 ? 's' : ''} à ramasser`);
  if (count('sick') && state.sick) lines.push('🤒 Il est tombé malade');
  const missed = events.filter((e) => e.type === 'mistake');
  if (missed.length) lines.push(`📋 ${missed.length} appel${missed.length > 1 ? 's' : ''} sans réponse : ${[...new Set(missed.map((m) => (Sim.ALERTS[m.key] || {}).label).filter(Boolean))].join(' · ')}`);
  if (!lines.length) lines.push('😌 Rien de spécial, il t’attendait sagement');

  const t = el('table', 'stat-table away-table');
  for (const [k, ico, name] of GAUGES) {
    const a = Math.round(before[k]), b = Math.round(state[k]);
    const tr = el('tr');
    const d = b - a;
    tr.append(el('td', '', `${ico} ${name}`), el('td', 'away-val' + (d < -10 ? ' down' : (d > 0 ? ' up' : '')), `${a} → ${b}`));
    t.appendChild(tr);
  }
  const box = el('div', 'away-todo');
  const row = todoRow(() => { awayModal.hidden = true; });
  box.appendChild(el('p', 'away-h', row ? 'À faire maintenant :' : 'Tout va bien, profite de lui 💕'));
  if (row) box.appendChild(row);
  const ok = el('button', 'btn wide-btn cloud-main', 'Je m’occupe de lui 💪');
  ok.addEventListener('click', () => { awayModal.hidden = true; });
  $('awayTitle').textContent = `🕰️ ${absent} sans toi`;
  $('awayBody').replaceChildren(el('ul', 'away-list', ''), t, box, ok);
  const ul = $('awayBody').querySelector('.away-list');
  lines.forEach((l) => ul.appendChild(el('li', '', l)));
  awayModal.hidden = false;
}
$('awayClose').addEventListener('click', () => { awayModal.hidden = true; });
awayModal.addEventListener('click', (e) => { if (e.target === awayModal) awayModal.hidden = true; });

// ---- Quoi de neuf ? (une fois par mise à jour) ----
const NEWS_V = '2026-11-pilote';
const newsModal = $('newsModal');
function closeNews() { newsModal.hidden = true; state.newsSeen = NEWS_V; saveState(); }
$('newsOk').addEventListener('click', closeNews);
$('newsClose').addEventListener('click', closeNews);
newsModal.addEventListener('click', (e) => { if (e.target === newsModal) closeNews(); });

// au démarrage : d'abord le résumé (il a peut-être faim), puis les nouveautés
if (preAbsence.from && away.hours >= 3) queuePopup(() => openAway(away.hours, away.events, preAbsence.gauges));
if (!state.seenHelp) state.newsSeen = NEWS_V;            // nouveau joueur : l'aide suffit
else if (state.newsSeen !== NEWS_V && !window.__noHelp) queuePopup(() => { newsModal.hidden = false; });
renderGaugeValues();
renderNeeds();
