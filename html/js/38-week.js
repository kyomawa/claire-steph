// =====================================================================
//  Bilan de la semaine (bien-être heure par heure) + récompenses de série
// =====================================================================
const weekModal = $('weekModal');

function wellbeing() {
  const avg = (state.hunger + state.energy + state.happy + state.love) / 4;
  return clamp(avg - state.poops.length * 5 - (state.sick ? 20 : 0) - (state.sulk ? 10 : 0));
}
function sampleNow(t) {
  const d = new Date(t || Date.now());
  Career.sample(state, dayKey(d), d.getHours(), wellbeing());
}

function weekChart(days) {
  const box = el('div', 'week-chart');
  for (const d of days) {
    const col = el('div', 'wk-col');
    const bar = el('div', 'wk-bar' + (d.value === null ? ' empty' : ''));
    bar.style.height = (d.value === null ? 6 : Math.max(6, d.value)) + '%';
    if (d.value !== null) bar.classList.add(d.value >= 70 ? 'good' : d.value >= 45 ? 'mid' : 'low');
    bar.title = d.value === null ? 'pas de nouvelles' : `${d.value} / 100`;
    const label = new Date(d.day + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'narrow' });
    col.append(el('span', 'wk-val', d.value === null ? '' : String(d.value)), bar, el('span', 'wk-day', label));
    box.appendChild(col);
  }
  return box;
}

function renderWeek(report, withReward) {
  const nowMs = Date.now();
  const mistakes = state.mistakes.filter((m) => nowMs - m.t < 7 * DAY_MS).length;
  const gpPts = Object.entries(state.career.gp).filter(([d]) => report.days.some((x) => x.day === d)).reduce((a, [, g]) => a + g.points, 0);
  const pk = Sim.personality(state);
  $('weekGrade').textContent = report.grade;
  $('weekGrade').className = 'grade grade-' + report.grade;
  const t = el('table', 'stat-table');
  for (const [k, v] of [
    ['💛 Bien-être moyen', `${report.avg} / 100`],
    ['📋 Soins oubliés', String(mistakes)],
    ['🏁 Points de Grand Prix', String(gpPts)],
    ['🧬 Personnalité', pk ? `${Sim.PERSONALITIES[pk].icon} ${Sim.PERSONALITIES[pk].name}` : 'Se découvre encore…'],
    ['⚖️ Poids', `${state.weight.toFixed(1)} kg`]
  ]) { const tr = el('tr'); tr.append(el('td', '', k), el('td', '', v)); t.appendChild(tr); }
  const msg = { S: 'Semaine parfaite, il est aux anges 🌟', A: 'Très belle semaine 💕', B: 'Bonne semaine, quelques oublis 🙂', C: 'Il a manqué d’attention cette semaine 🥺', D: 'Il t’a beaucoup attendu… 💔' }[report.grade];
  $('weekBody').replaceChildren(el('p', 'week-msg', msg), weekChart(report.days), t,
    el('p', 'week-reward', withReward ? `Récompense : +${report.reward} ⛽` : 'Le bilan complet arrive chaque semaine 📈'));
}

function weekReportNow() {
  const nowMs = Date.now();
  const mistakes = state.mistakes.filter((m) => nowMs - m.t < 7 * DAY_MS).length;
  return Career.weekReport(state, dayKey(now()), mistakes);
}

function openWeek(withReward) {
  const r = weekReportNow();
  renderWeek(r, withReward);
  weekModal.hidden = false;
  return r;
}
$('weekClose').addEventListener('click', () => { weekModal.hidden = true; });
weekModal.addEventListener('click', (e) => { if (e.target === weekModal) weekModal.hidden = true; });

// bilan hebdomadaire automatique : tous les 7 jours
function maybeWeeklyReport() {
  const today = dayKey(now());
  if (!state.lastReport) { state.lastReport = today; return; }
  const days = Math.round((new Date(today) - new Date(state.lastReport)) / DAY_MS);
  if (days < 7) return;
  state.lastReport = today;
  const r = openWeek(true);
  earn(r.reward, 'bilan de la semaine');
  if (r.grade === 'S') state.bestGrade = 'S';
  addMemory(`📈 Bilan de la semaine : ${r.grade} (${r.avg}/100)`, 'special');
  checkTrophies();
}

// série de jours d'affilée : jetons chaque jour, gros bonus le 7ᵉ
function streakBonus() {
  if (!isNewDay || state.streakPaid === dayKey(now())) return;
  state.streakPaid = dayKey(now());
  const r = Career.streakReward(state.streak);
  earn(r, `${state.streak}ᵉ jour d’affilée 🔥`);
  if (state.streak % 7 === 0) setTimeout(() => { toast('🎁 7 jours d’affilée : gros bonus !'); confetti($('hudStreak'), 30); }, 900);
}

// rattrapage : un relevé par heure d'absence (le bilan reflète aussi les heures sans toi)
function sampleAbsence(fromMs) {
  if (!fromMs) return;
  const to = Date.now();
  const start = Math.max(fromMs, to - 72 * HOUR_MS);
  // on rejoue l'absence heure par heure sur une copie pour mesurer le bien-être de chaque heure
  const copy = preAbsence.state;
  for (let t = start; t < to; t += HOUR_MS) {
    const end = Math.min(to, t + HOUR_MS);
    Sim.simulate(copy, t, end, { hourOf: hourOfTs, random: () => 0.5 });
    const avg = (copy.hunger + copy.energy + copy.happy + copy.love) / 4 - copy.poops.length * 5 - (copy.sick ? 20 : 0);
    const d = new Date(end);
    Career.sample(state, dayKey(d), d.getHours(), clamp(avg));
  }
}

sampleAbsence(preAbsence.from);
setTimeout(() => { streakBonus(); setTimeout(maybeWeeklyReport, 1500); }, 1200);
setInterval(() => sampleNow(), 60 * 1000);
sampleNow();
