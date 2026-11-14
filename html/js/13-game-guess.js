// =====================================================================
//  Choix du jeu + « Gauche ou droite ? »
// =====================================================================
const gamesModal = $('games');
$('btnGame').addEventListener('click', () => {
  if (!canAct()) return;
  if (state.sick) return refuse('Trop malade pour jouer 🤒');
  if (state.energy < 15) return refuse('Trop fatigué pour jouer 😪');
  $('bestCatch').textContent = `Record : ${state.bestScore}`;
  $('bestGuess').textContent = `Record : ${state.bestGuess} / 5`;
  $('bestMemoryTxt').textContent = state.bestMemory ? `Record : ${state.bestMemory} coups` : 'Pas encore joué';
  $('bestDanceTxt').textContent = `Record : ${state.bestDance} pts`;
  $('bestRaceTxt').textContent = `Record : ${state.bestRace || 0} pts`;
  gamesModal.hidden = false;
});
$('gamesClose').addEventListener('click', () => { gamesModal.hidden = true; });
gamesModal.addEventListener('click', (e) => { if (e.target === gamesModal) gamesModal.hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') gamesModal.hidden = true; });
$('pickCatch').addEventListener('click', () => { gamesModal.hidden = true; if (!canAct()) return toast('Attends la fin de sa visite 😍'); startCatchGame(); });
$('pickGuess').addEventListener('click', () => { gamesModal.hidden = true; if (!canAct()) return toast('Attends la fin de sa visite 😍'); startGuessGame(); });

const guessEl = $('guess');
const guessHim = $('guessHim');
const guess = { round: 0, wins: 0, locked: false };

function startGuessGame() {
  if (!canAct()) return;
  busy = true;
  game.active = true;
  stopHim();
  bubbleEl.classList.remove('show');
  spriteEl.style.visibility = 'hidden';
  afterCare();
  guess.round = 0;
  guess.wins = 0;
  guessEl.hidden = false;
  nextGuessRound();
}

function nextGuessRound() {
  guess.round++;
  guess.locked = false;
  guessHim.src = A.himStand;
  guessHim.style.transform = '';
  guessHim.classList.remove('pose-jump');
  $('guessInfo').textContent = `Manche ${guess.round} / 5 · ${guess.wins} 🏆`;
  $('guessMsg').textContent = 'Il va regarder de quel côté ? 🤔';
  $('guessLeft').disabled = false;
  $('guessRight').disabled = false;
}

function playGuess(side) {
  if (guess.locked) return;
  guess.locked = true;
  $('guessLeft').disabled = true;
  $('guessRight').disabled = true;
  const his = Math.random() < 0.5 ? 'left' : 'right';
  guessHim.src = A.himWalk;
  guessHim.style.transform = his === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
  const win = his === side;
  if (win) {
    guess.wins++;
    setTimeout(() => { guessHim.src = A.himJump; guessHim.classList.add('pose-jump'); }, 350);
    $('guessMsg').textContent = pick(['Bien vu ! 🎉', 'Télépathie 🔮', 'Gagné ! 💕']);
    sfx.coin();
  } else {
    $('guessMsg').textContent = pick(['Raté ! 😜', 'Perdu, hihi 😝', 'Pas par là ! 🙃']);
    sfx.bad();
  }
  $('guessInfo').textContent = `Manche ${guess.round} / 5 · ${guess.wins} 🏆`;
  setTimeout(() => (guess.round >= 5 ? endGuessGame() : nextGuessRound()), 1300);
}
$('guessLeft').addEventListener('click', (e) => { e.stopPropagation(); playGuess('left'); });
$('guessRight').addEventListener('click', (e) => { e.stopPropagation(); playGuess('right'); });

function endGuessGame() {
  const w = guess.wins;
  const record = w > state.bestGuess;
  if (record) state.bestGuess = w;
  $('guessMsg').textContent = `${w} / 5 ${w >= 4 ? '🔮 Vous êtes connectés !' : (w >= 2 ? '😊 Pas mal !' : '😜 Il est imprévisible')}${record ? ' · record !' : ''}`;
  state.happy = clamp(state.happy + w * 5);
  state.love = clamp(state.love + w * 2);
  state.energy = clamp(state.energy - 5);
  state.counters.games++;
  gainXp(2 + w * 2);
  earn(w * 2, 'au mini-jeu');
  updateConditions(true);
  renderStats();
  checkTrophies();
  setTimeout(() => {
    guessEl.hidden = true;
    spriteEl.style.visibility = '';
    game.active = false;
    busy = false;
    refreshHim(true);
  }, 2200);
}
