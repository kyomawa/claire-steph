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

// ---- Grand Prix du jour ----
function gpStatus() {
  const today = dayKey(now());
  const circuit = Career.circuitOfDay(today);
  const done = state.career.gp[today];
  const h = now().getHours();
  let why = null;
  if (done) why = 'done';
  else if (h < 9 || h >= 22) why = 'Les stands ouvrent de 9 h à 22 h 🌙';
  else if (state.sick) why = 'Il est malade : soigne-le avant de courir 🤒';
  else if (state.energy < 30) why = 'Trop fatigué pour courir (énergie < 30) 😪';
  return { today, circuit, done, why };
}

function startGP() {
  const g = gpStatus();
  if (g.why) return toast(g.why === 'done' ? 'Déjà couru aujourd’hui 🏁' : g.why);
  careerModal.hidden = true;
  if (!canAct()) return toast('Attends la fin de sa visite 😍');
  startRace();
  race.gp = g.circuit;
}

function endGP() {
  race.over = true;
  const circuit = race.gp;
  const s = race.score;
  const today = dayKey(now());
  const round = state.career.season.races + 1;
  const res = Career.classify(Career.performance(state.skills, s, state.energy), round);
  const archived = Career.recordGP(state, today, circuit, res.place, res.points);
  race.result = `${res.place === 1 ? '🥇' : res.place === 2 ? '🥈' : res.place === 3 ? '🥉' : '🏁'} ${ord(res.place)} à ${circuit.name}`;
  race.result2 = `+${res.points} pts · ${s} pts de course`;
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
  addMemory(`🏁 Grand Prix de ${circuit.name} : ${ord(res.place)}`, res.place <= 3 ? 'special' : 'note');
  if (archived) {
    const title = Career.seasonTitle(archived.points);
    toast(`Saison terminée : ${title} (${archived.points} pts)`);
    addMemory(`🏆 Saison ${archived.month} : ${title}`, 'special');
  }
  lastGP = { circuit, ...res, score: s };
  updateConditions(true);
  renderStats();
  showDeltas(before);
  checkTrophies();
  setTimeout(() => {
    race.on = false;
    cancelAnimationFrame(race.raf);
    raceEl.hidden = true;
    spriteEl.style.visibility = '';
    game.active = false;
    busy = false;
    refreshHim(true);
    openCareer();
    checkChapters();
  }, 2600);
}

// ---- Fenêtre carrière ----
function skillBars() {
  const box = el('div', 'skills');
  for (const [k, def] of Object.entries(Career.SKILLS)) {
    const v = state.skills[k];
    const row = el('div', 'skill');
    const bar = el('div', 'd-bar');
    const fill = el('div', 'd-fill');
    fill.style.width = v + '%';
    bar.appendChild(fill);
    row.append(el('span', 'sk-name', `${def.icon} ${def.name}`), bar, el('span', 'sk-val', String(Math.floor(v))));
    box.appendChild(row);
  }
  return box;
}

function renderCareer() {
  const g = gpStatus();
  const c = state.career;
  const body = $('careerBody');
  const card = el('div', 'gp-card');
  card.append(el('div', 'gp-eyebrow', 'Grand Prix du jour'), el('div', 'gp-name', `${g.circuit.flag} ${g.circuit.name} ${g.circuit.icon}`));
  if (lastGP && g.done) {
    const pod = el('ol', 'podium');
    lastGP.field.slice(0, Math.max(3, lastGP.place)).forEach((d, i) => {
      if (i >= 3 && !d.me) return;
      pod.appendChild(el('li', d.me ? 'me' : '', `${i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`} ${d.me ? (petNameEl.textContent.replace(/^Mon\s+/i, '') || 'Lui') : d.name}`));
    });
    card.append(el('div', 'gp-result', `${ord(lastGP.place)} place · +${lastGP.points} pts`), pod);
  } else if (g.done) {
    card.appendChild(el('div', 'gp-result', `Couru : ${ord(g.done.place)} place · +${g.done.points} pts · prochain Grand Prix demain`));
  } else {
    const b = el('button', 'btn wide-btn cloud-main', '🏁 Prendre le départ');
    b.disabled = !!g.why;
    b.addEventListener('click', startGP);
    card.append(el('p', 'gp-help', g.why || 'Tu joues la course, ses compétences font le reste. Énergie −15.'), b);
  }
  const season = el('div', 'season');
  season.append(el('h3', '', `🏆 Championnat ${new Date(now()).toLocaleDateString('fr-FR', { month: 'long' })}`));
  const t = el('table', 'stat-table');
  for (const [k, v] of [['Points', c.season.points], ['Courses', c.season.races], ['Victoires', c.season.wins], ['Podiums', c.season.podiums], ['En route vers', Career.seasonTitle(c.season.points)]]) {
    const tr = el('tr'); tr.append(el('td', '', k), el('td', '', String(v))); t.appendChild(tr);
  }
  season.appendChild(t);
  if (c.seasons.length) season.appendChild(el('p', 'gp-help', 'Saisons passées : ' + c.seasons.slice(-3).map((x) => `${x.month} · ${x.points} pts`).join(' · ')));
  const story = el('div', 'story');
  story.appendChild(el('h3', '', '📖 Le rêve du Mans'));
  for (const ch of Career.CHAPTERS) {
    const got = !!c.chapters[ch.id];
    const d = el('details', 'chapter' + (got ? '' : ' locked'));
    const sm = el('summary', '', got ? `${ch.icon} ${ch.title}` : '🔒 Chapitre à venir');
    d.appendChild(sm);
    if (got) d.appendChild(el('p', '', ch.text));
    story.appendChild(d);
  }
  body.replaceChildren(card, el('h3', 'sk-title', '📊 Compétences'), skillBars(), season, story);
}

function openCareer() { renderCareer(); careerModal.hidden = false; }
$('raceNo').addEventListener('click', (e) => { e.stopPropagation(); openCareer(); sfx.tap(); });
$('careerClose').addEventListener('click', () => { careerModal.hidden = true; lastGP = null; });
careerModal.addEventListener('click', (e) => { if (e.target === careerModal) { careerModal.hidden = true; lastGP = null; } });

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
