// =====================================================================
//  Rangs de pilote
// =====================================================================
const RANKS = [
  [1, 'Apprenti pilote'], [2, 'Pilote du dimanche'], [4, 'Pilote'], [6, 'Pilote confirmé'],
  [8, "Pilote d'élite"], [10, 'Champion Gulf'], [15, 'Légende du circuit']
];
function rankFor(lvl) { let r = RANKS[0][1]; for (const [n, t] of RANKS) if (lvl >= n) r = t; return r; }
function renderRank() {
  const lvl = levelFor(state.xp);
  const no = $('raceNo');
  no.textContent = String(lvl);
  no.classList.toggle('two', lvl >= 10);
  no.title = `${rankFor(lvl)} · niveau ${lvl}`;
  $('hudLevel').title = rankFor(lvl);
}
