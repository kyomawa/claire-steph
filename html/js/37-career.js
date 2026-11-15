// =====================================================================
//  Carrière de pilote : compétences, Grand Prix du jour, championnat,
//  histoire « Le rêve du Mans » (règles : js/engine/career.js)
// =====================================================================
const Career = window.CheriCareer;
Career.ensure(state);
const careerModal = $('careerModal');
const ord = (n) => (n === 1 ? '1ʳᵉ' : `${n}ᵉ`);
let lastGP = null;

// ---- Entraînement : chaque activité fait progresser des compétences ----
function trainFor(activity, mult) {
  const gains = Career.train(state, activity, dayKey(now()), mult);
  const shown = Object.entries(gains).filter(([, g]) => g >= 0.5);
  shown.slice(0, 2).forEach(([k, g], i) => setTimeout(() => {
    spawnHeart((spriteEl.offsetLeft + 4 + i * 26) + 'px', '104px', `${Career.SKILLS[k].icon}+${Math.round(g * 10) / 10}`);
  }, 350 + i * 180));
  if (shown.length) checkChapters();
}

// ---- Petits outils d'affichage ----
const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : '🏁');
const signed = (v) => { const r = Math.round(v); return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r); };
const hisName = () => petNameEl.textContent.replace(/^Mon\s+/i, '').trim() || 'Lui';
function monthName(ym) {
  const m = new Date(ym + '-15T12:00:00').toLocaleDateString('fr-FR', { month: 'long' });
  return /^[aeiouéo]/i.test(m) ? `d’${m}` : `de ${m}`;
}
const ACT_LABEL = {
  runs: '🏃 Courir', codes: '💻 Coder', meals: '🍽️ Manger', hugs: '🥰 Câlins', notes: '💌 Mots doux', fetches: '🎾 Ballon',
  moment_sport: '💑 Sport à deux', moment_cuisine: '💑 On cuisine', moment_love: '💑 Moments à deux', moment_party: '💑 Soirée dansante',
  game_race: '🏎️ Course Gulf', game_dance: '🪩 Danse', game_memory: '🧠 Mémoire', game_guess: '⬅️ Gauche ou droite',
  game_catch: '💋 Attrape les bisous', game_bugs: '🐛 Chasse aux bugs', game_recipe: '🍳 Recette à deux', game_lights: '🚦 Feux de départ'
};
// les 3 activités qui entraînent le plus une compétence
function howToTrain(k) {
  return Object.entries(Career.TRAINING).filter(([, t]) => t[k]).sort((x, y) => y[1][k] - x[1][k]).slice(0, 3).map(([act]) => ACT_LABEL[act] || act).join(' · ');
}

// ---- Grand Prix du jour ----
let careerTab = 'course';
let gpTire = null;          // pneus choisis pour la course du jour

function gpStatus() {
  const today = dayKey(now());
  const circuit = Career.circuitOfDay(today);
  const weather = Career.gpWeather(today, circuit);
  const done = state.career.gp[today];
  const h = now().getHours();
  let why = null;
  if (done) why = 'done';
  else if (h < 9 || h >= 22) why = 'Les stands ouvrent de 9 h à 22 h 🌙';
  else if (state.sick) why = 'Il est malade : soigne-le avant de courir 🤒';
  else if (state.energy < 30) why = 'Trop fatigué pour courir (énergie < 30) 😪';
  return { today, circuit, weather, done, why };
}

function startGP() {
  const g = gpStatus();
  if (g.why) return toast(g.why === 'done' ? 'Déjà couru aujourd’hui 🏁' : g.why);
  careerModal.hidden = true;
  if (!canAct()) return toast('Attends la fin de sa visite 😍');
  const tire = gpTire || Career.bestTire(g.weather);
  startRace({ gp: g.circuit, weather: g.weather, tire });
}

function endGP() {
  race.over = true;
  const circuit = race.gp;
  const s = race.score;
  const today = dayKey(now());
  const ended = Career.rollSeason(state, today);          // le mois a changé pendant la partie
  if (ended) seasonEnded(ended);
  const round = state.career.season.races + 1;
  const det = Career.performanceDetail(state.skills, s, state.energy, null, { circuit, car: state.car, tire: race.tire, weather: race.weather });
  const res = Career.classify(det.total, round);
  const posBefore = state.career.season.races ? Career.myPosition(state) : null;
  const rival = Career.rivalOf(state);
  Career.recordGP(state, today, circuit, res.place, res.points, res.field, { weather: race.weather });
  const posAfter = Career.myPosition(state);
  race.result = `${medal(res.place)} ${ord(res.place)} à ${circuit.name}`;
  race.result2 = `+${res.points} pts · ${ord(posAfter)} au championnat`;
  const before = snap();
  state.energy = clamp(state.energy - 15);
  state.happy = clamp(state.happy + (res.place <= 3 ? 20 : 6));
  state.counters.games++;
  state.counters.races++;
  act('sport', 3);
  trainFor('game_race', 1.5);
  gainXp([14, 11, 9][res.place - 1] || 4);
  earn([30, 20, 15][res.place - 1] || 5, `au Grand Prix`);
  if (res.place <= 3) { sfx.level(); confetti($('raceNo'), 40); } else sfx.happy();
  addMemory(`🏁 Grand Prix de ${circuit.name}${race.weather === 'pluie' ? ' sous la pluie' : ''} : ${ord(res.place)}`, res.place <= 3 ? 'special' : 'note');
  lastGP = { circuit, ...res, score: s, det, posBefore, posAfter, rival, tire: race.tire, weather: race.weather };
  updateConditions(true);
  renderStats();
  showDeltas(before);
  checkTrophies();
  endGameLater(() => {
    race.on = false;
    cancelAnimationFrame(race.raf);
    raceEl.hidden = true;
  }, 2600, () => { openCareer('course'); checkChapters(); });
}

// ---- Fin de saison : place au championnat, titre, récompense ----
function seasonEnded(a) {
  if (a.reward) earn(a.reward, 'fin du championnat');
  addMemory(`🏆 Championnat ${monthName(a.month)} : ${ord(a.pos)} · ${a.title}`, 'special');
  const show = () => {
    $('chapterIcon').textContent = a.pos <= 3 ? medal(a.pos) : '🏁';
    $('chapterTitle').textContent = `Championnat ${monthName(a.month)} : ${ord(a.pos)}`;
    const top = a.top.map((n) => (n === 'lui' ? hisName() : n)).join(', ');
    $('chapterText').textContent = `${a.title} ! ${a.races} course${a.races > 1 ? 's' : ''}, ${a.wins} victoire${a.wins > 1 ? 's' : ''}, ${a.points} points. Podium du championnat : ${top}. Un nouveau championnat commence.`;
    $('chapterReward').textContent = a.reward ? `+${a.reward} ⛽` : '';
    chapterModal.hidden = false;
    sfx.level();
    if (a.pos <= 3) confetti($('raceNo'), 40);
  };
  if (typeof queuePopup === 'function') queuePopup(show); else setTimeout(show, 1500);
  checkTrophies();
}

// ---- Garage ----
function circuitsFor(part) { return Career.CIRCUITS.filter((c) => c.part === part).map((c) => c.name).join(' et '); }
function buyPart(k) {
  const r = Career.upgrade(state, k);
  if (!r) return;
  renderTokens();
  saveState();
  sfx.coin();
  buzz(30);
  toast(`${Career.PARTS[k].icon} ${Career.PARTS[k].name} niveau ${r.level} !`);
  addMemory(`🔧 Garage : ${Career.PARTS[k].name} niveau ${r.level}`, 'note');
  checkTrophies();
  renderCareer();
}

// ---- Fenêtre carrière, en onglets ----
function resultBlock(r) {
  const out = [el('div', 'gp-result', `${medal(r.place)} ${ord(r.place)} place · +${r.points} pts`)];
  const pod = el('ol', 'podium');
  r.field.forEach((d, i) => {
    if (i >= 3 && !d.me) return;
    pod.appendChild(el('li', d.me ? 'me' : '', `${i < 3 ? medal(i + 1) : `${i + 1}.`} ${d.me ? hisName() : d.name}`));
  });
  out.push(pod);
  const d = r.det.parts;
  const t = el('table', 'stat-table gp-detail');
  const tire = Career.TIRES[r.tire];
  for (const [label, v] of [['🎮 Ta course', d.course], ['📊 Ses compétences', d.skills], ['🔧 Sa voiture', d.car], [`${tire.icon} Pneus ${tire.name.toLowerCase()}`, d.tires], ['😪 Fatigue', d.form], ['🍀 Chance', d.luck]]) {
    if (label.startsWith('😪') && !v) continue;
    const tr = el('tr');
    tr.append(el('td', '', label), el('td', v < 0 ? 'neg' : '', signed(v)));
    t.appendChild(tr);
  }
  out.push(el('div', 'gp-sub', 'Ce qui a compté'), t);
  const msgs = [];
  if (r.tire === Career.bestTire(r.weather)) msgs.push('Bon choix de pneus 👍');
  else msgs.push(r.weather === 'pluie' ? 'Il pleuvait : les pneus pluie étaient le bon choix' : (r.tire === 'durs' ? 'Piste sèche : les tendres allaient plus vite' : 'Piste sèche : les pneus pluie ralentissaient'));
  if (r.posBefore) msgs.push(r.posAfter < r.posBefore ? `⬆️ ${ord(r.posAfter)} au championnat` : (r.posAfter > r.posBefore ? `⬇️ ${ord(r.posAfter)} au championnat` : `${ord(r.posAfter)} au championnat`));
  else msgs.push(`🏆 ${ord(r.posAfter)} au championnat`);
  if (r.rival) msgs.push(r.field.findIndex((x) => x.name === r.rival.name) > r.place - 1 ? `🎯 Tu as battu ${r.rival.name} !` : `🎯 ${r.rival.name} a fini devant`);
  out.push(el('p', 'gp-help', msgs.join(' · ')));
  return out;
}

function courseView() {
  const g = gpStatus();
  const c = state.career;
  const card = el('div', 'gp-card');
  const part = Career.PARTS[g.circuit.part];
  card.append(
    el('div', 'gp-eyebrow', `Grand Prix du jour · manche ${c.season.races + (g.done ? 0 : 1)}`),
    el('div', 'gp-name', `${g.circuit.flag} ${g.circuit.name} ${g.circuit.icon}`),
    el('p', 'gp-help', g.circuit.trait)
  );
  const chips = el('div', 'gp-chips');
  chips.append(el('span', 'gp-chip ' + (g.weather === 'pluie' ? 'wet' : 'dry'), g.weather === 'pluie' ? '☔ Pluie' : '☀️ Piste sèche'),
    el('span', 'gp-chip', `${part.icon} Pièce clé : ${part.name} (niv. ${state.car[g.circuit.part]})`));
  card.appendChild(chips);
  if (lastGP && g.done) card.append(...resultBlock(lastGP));
  else if (g.done) card.appendChild(el('div', 'gp-result', `Couru : ${medal(g.done.place)} ${ord(g.done.place)} place · +${g.done.points} pts · prochain Grand Prix demain`));
  else {
    const best = Career.bestTire(g.weather);
    if (!gpTire) gpTire = best;
    const row = el('div', 'tire-row');
    for (const [id, t] of Object.entries(Career.TIRES)) {
      const b = el('button', 'tire' + (gpTire === id ? ' on' : ''));
      b.dataset.tire = id;
      b.setAttribute('aria-pressed', String(gpTire === id));
      b.append(el('span', 'tire-ico', t.icon), el('span', 'tire-name', t.name), el('span', 'tire-fx', signed(Career.tireBonus(id, g.weather))));
      if (id === best) b.appendChild(el('span', 'tire-tag', 'conseillé'));
      b.addEventListener('click', () => { gpTire = id; renderCareer(); sfx.tap(); });
      row.appendChild(b);
    }
    const go = el('button', 'btn wide-btn cloud-main', '🏁 Prendre le départ');
    go.id = 'gpGo';
    go.disabled = !!g.why;
    go.addEventListener('click', startGP);
    card.append(el('div', 'gp-sub', '1. Choisis les pneus'), row, el('p', 'gp-help small', Career.TIRES[gpTire].desc),
      el('div', 'gp-sub', '2. Joue la course'), el('p', 'gp-help', g.why || 'Ramasse les ⛽ et 💕, évite les plots et l’huile. Énergie −15.'), go);
  }
  const out = [card];
  const rv = Career.rivalOf(state);
  if (rv) {
    const pos = Career.myPosition(state);
    out.push(el('div', 'rival-line', `🏆 ${ord(pos)} du championnat · 🎯 ${rv.ahead ? `${rv.name} est ${rv.gap} pt${rv.gap > 1 ? 's' : ''} devant` : `${rv.name} te suit à ${rv.gap} pt${rv.gap > 1 ? 's' : ''}`}`));
  } else out.push(el('div', 'rival-line', '🏆 Championnat du mois : première course !'));
  out.push(el('p', 'gp-explain', 'Le classement mélange ta course, ses compétences (selon le circuit), sa voiture et tes pneus, avec un peu de chance.'));
  return out;
}

function garageView() {
  const box = el('div', 'garage-car');
  const cv = el('canvas', 'garage-canvas');
  box.append(cv, el('div', 'garage-bonus', `Bonus de la voiture au Grand Prix : +${String(Career.carBonus(state.car, null)).replace('.', ',')} partout`));
  const out = [box];
  for (const [k, p] of Object.entries(Career.PARTS)) {
    const lvl = state.car[k];
    const cost = Career.upgradeCost(lvl);
    const row = el('div', 'part');
    const mid = el('div', 'part-mid');
    mid.append(
      el('div', 'part-name', `${p.name} · niv. ${lvl}/${Career.PART_MAX}`),
      el('div', 'part-dots', '●'.repeat(lvl) + '○'.repeat(Career.PART_MAX - lvl)),
      el('div', 'part-desc', `${p.desc} · compte en plus à ${circuitsFor(k)}`)
    );
    const b = el('button', 'btn part-buy', cost === null ? 'Max ✨' : `${cost} ⛽`);
    b.dataset.part = k;
    b.disabled = cost === null || (state.tokens || 0) < cost;
    b.addEventListener('click', () => buyPart(k));
    row.append(el('span', 'part-ico', p.icon), mid, b);
    out.push(row);
  }
  out.push(el('p', 'gp-help', `Tu as ${state.tokens || 0} ⛽. Chaque niveau donne +0,7 au Grand Prix, et +1,2 de plus sur les circuits où la pièce compte. Les améliorations se voient sur la voiture.`));
  setTimeout(() => { try { drawCarPreview(cv); } catch (e) { /* aperçu facultatif */ } }, 0);
  return out;
}

function standingsView() {
  const c = state.career;
  const ym = c.season.month || dayKey(now()).slice(0, 7);
  const out = [el('h3', 'sk-title', `🏆 Championnat ${monthName(ym)}`)];
  const t = el('table', 'standings');
  Career.standings(state).forEach((r, i) => {
    const tr = el('tr', r.me ? 'me' : '');
    tr.append(el('td', 'pos', i < 3 ? medal(i + 1) : String(i + 1)), el('td', 'who', r.me ? `⭐ ${hisName()}` : r.name), el('td', 'pts', `${r.pts} pts`));
    t.appendChild(tr);
  });
  out.push(t);
  const pos = Career.myPosition(state);
  const end = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  out.push(el('p', 'gp-help', c.season.races
    ? `En route vers : ${Career.seasonTitleFor(pos)} · fin le ${end} · récompense : ${Career.SEASON_REWARDS[pos - 1]} ⛽`
    : 'Le championnat du mois commence à ta première course.'));
  out.push(el('h3', 'sk-title', '🗺️ Palmarès par circuit'));
  const grid = el('div', 'palmares');
  for (const p of Career.palmares(state)) {
    const card = el('div', 'palm' + (p.best ? '' : ' none'));
    card.append(el('div', 'palm-flag', p.flag), el('div', 'palm-name', p.name),
      el('div', 'palm-best', p.best ? `${medal(p.best)} ${ord(p.best)}` : 'à découvrir'),
      el('div', 'palm-sub', p.races ? `${p.races} course${p.races > 1 ? 's' : ''}${p.wins ? ` · ${p.wins} 🥇` : ''}` : ''));
    grid.appendChild(card);
  }
  out.push(grid);
  if (c.seasons.length) {
    out.push(el('h3', 'sk-title', '📜 Saisons passées'));
    const list = el('ul', 'seasons-list');
    c.seasons.slice(-6).reverse().forEach((x) => list.appendChild(el('li', '', `${monthName(x.month).replace(/^d(e |’)/, '')} : ${x.pos ? ord(x.pos) + ' · ' : ''}${x.title || Career.seasonTitle(x.points)} · ${x.points} pts`)));
    out.push(list);
  }
  return out;
}

function pilotView() {
  const out = [el('h3', 'sk-title', '📊 Compétences')];
  const box = el('div', 'skills');
  const gained = state.skillDay && state.skillDay.day === dayKey(now()) ? state.skillDay.gained : {};
  for (const [k, def] of Object.entries(Career.SKILLS)) {
    const v = state.skills[k];
    const row = el('div', 'skill');
    const bar = el('div', 'd-bar');
    const fill = el('div', 'd-fill');
    fill.style.width = v + '%';
    bar.appendChild(fill);
    row.append(el('span', 'sk-name', `${def.icon} ${def.name}`), bar, el('span', 'sk-val', String(Math.floor(v))));
    box.append(row, el('div', 'sk-how', `↑ ${howToTrain(k)} · aujourd’hui +${String(Math.round((gained[k] || 0) * 10) / 10).replace('.', ',')} / ${Career.DAILY_CAP}`));
  }
  out.push(box, el('p', 'gp-help', 'Chaque compétence gagne au plus +6 par jour, et progresse plus lentement près de 100.'));
  const c = state.career;
  const bestSeason = c.seasons.filter((x) => x.pos).reduce((m, x) => Math.min(m, x.pos), 99);
  const t = el('table', 'stat-table');
  for (const [k, v] of [['🏁 Grands Prix', c.races], ['🥇 Victoires', c.wins], ['🏆 Podiums', c.podiums], ['☔ Victoires sous la pluie', c.rainWins], ['📜 Meilleur championnat', bestSeason < 99 ? `${ord(bestSeason)} · ${Career.seasonTitleFor(bestSeason)}` : '—'], ['🔧 Bonus voiture', `+${String(Career.carBonus(state.car, null)).replace('.', ',')}`]]) {
    const tr = el('tr'); tr.append(el('td', '', k), el('td', '', String(v))); t.appendChild(tr);
  }
  out.push(el('h3', 'sk-title', '🏎️ Sa carrière'), t);
  return out;
}

function storyView() {
  const story = el('div', 'story');
  for (const ch of Career.CHAPTERS) {
    const got = !!state.career.chapters[ch.id];
    const d = el('details', 'chapter' + (got ? '' : ' locked'));
    d.appendChild(el('summary', '', got ? `${ch.icon} ${ch.title}` : '🔒 Chapitre à venir'));
    if (got) d.appendChild(el('p', '', ch.text));
    story.appendChild(d);
  }
  return [el('h3', 'sk-title', '📖 Le rêve du Mans'), story];
}

const CAREER_VIEWS = { course: courseView, garage: garageView, classement: standingsView, pilote: pilotView, histoire: storyView };
function renderCareer() {
  document.querySelectorAll('#careerTabs .tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.ctab === careerTab)));
  const body = $('careerBody');
  body.replaceChildren(...(CAREER_VIEWS[careerTab] || courseView)());
}
function openCareer(tab) {
  if (tab) careerTab = tab;
  renderCareer();
  careerModal.hidden = false;
  $('careerBody').scrollTop = 0;
}
document.querySelectorAll('#careerTabs .tab').forEach((t) => t.addEventListener('click', () => { careerTab = t.dataset.ctab; renderCareer(); $('careerBody').scrollTop = 0; sfx.tap(); }));
$('raceNo').addEventListener('click', (e) => { e.stopPropagation(); openCareer(); sfx.tap(); });
$('careerClose').addEventListener('click', () => { careerModal.hidden = true; lastGP = null; });
careerModal.addEventListener('click', (e) => { if (e.target === careerModal) { careerModal.hidden = true; lastGP = null; } });

// nouveau mois depuis la dernière visite : fin du championnat précédent
const bootSeasonEnd = Career.rollSeason(state, dayKey(now()));
if (bootSeasonEnd) setTimeout(() => seasonEnded(bootSeasonEnd), 1600);

// ---- Chapitres de l'histoire ----
const chapterModal = $('chapterModal');
const chapterQueue = [];
function checkChapters(force) {
  if (window.__noHelp && !force) return;     // tests automatiques : pas de fenêtre surprise
  for (const ch of Career.nextChapters(state, levelFor(state.xp))) {
    state.career.chapters[ch.id] = dayKey(now());
    chapterQueue.push(ch);
  }
  if (chapterQueue.length && chapterModal.hidden) {
    if (typeof queuePopup === 'function') queuePopup(showNextChapter); else showNextChapter();
  }
}
function showNextChapter() {
  const ch = chapterQueue.shift();
  if (!ch) return;
  const i = Career.CHAPTERS.indexOf(ch) + 1;
  $('chapterIcon').textContent = ch.icon;
  $('chapterTitle').textContent = `Chapitre ${i} — ${ch.title}`;
  $('chapterText').textContent = ch.text;
  $('chapterReward').textContent = `+${ch.reward} ⛽`;
  chapterModal.hidden = false;
  earn(ch.reward);
  addMemory(`📖 Chapitre ${i} : ${ch.title}`, 'special');
  sfx.level();
  checkTrophies();
}
$('chapterOk').addEventListener('click', () => { chapterModal.hidden = true; setTimeout(showNextChapter, 300); });

// premier chapitre au premier lancement (après l'aide)
setTimeout(() => { if (state.seenHelp) checkChapters(); }, 2500);
