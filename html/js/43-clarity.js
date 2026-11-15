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
  const todo = needsNow();
  const box = el('div', 'away-todo');
  box.appendChild(el('p', 'away-h', todo.length ? 'À faire maintenant :' : 'Tout va bien, profite de lui 💕'));
  const row = el('div', 'away-actions');
  for (const n of todo.slice(0, 3)) {
    const b = el('button', 'chip away-chip' + (n.urgent ? ' urgent' : ''), n.label);
    b.addEventListener('click', () => { awayModal.hidden = true; setTimeout(() => $(n.btn).click(), 120); });
    row.appendChild(b);
  }
  if (todo.length) box.appendChild(row);
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
const NEWS_V = '2026-11-jeux';
const newsModal = $('newsModal');
function closeNews() { newsModal.hidden = true; state.newsSeen = NEWS_V; saveState(); }
$('newsOk').addEventListener('click', closeNews);
$('newsClose').addEventListener('click', closeNews);
newsModal.addEventListener('click', (e) => { if (e.target === newsModal) closeNews(); });

// au démarrage : d'abord le résumé (il a peut-être faim), puis les nouveautés
if (preAbsence.from && away.hours >= 3) queuePopup(() => openAway(away.hours, away.events, preAbsence.gauges));
if (!state.seenHelp) state.newsSeen = NEWS_V;            // nouveau joueur : l'aide suffit
else if (state.newsSeen !== NEWS_V && !window.__noHelp) queuePopup(() => { newsModal.hidden = false; });
renderNeeds();
