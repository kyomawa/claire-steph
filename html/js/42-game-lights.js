// =====================================================================
//  Mini-jeu : Feux de départ (entraîne le pilotage)
//  5 feux rouges s'allument, puis s'éteignent : il faut taper le plus vite possible.
// =====================================================================
const lightsEl = $('lights');
const REFLEX_TRIES = 3;
const reflex = { phase: 'off', times: [], t0: 0, timers: [] };

function reflexLater(fn, ms) { reflex.timers.push(setTimeout(guard(fn, 'feux de départ'), ms)); }
function reflexStop() { reflex.timers.forEach(clearTimeout); reflex.timers = []; }
const fmtSec = (ms) => (ms / 1000).toFixed(3).replace('.', ',') + ' s';

function startLights() {
  if (!canAct()) return;
  beginGame();
  reflexStop();
  reflex.times = [];
  $('lightsGantry').replaceChildren(...Array.from({ length: 5 }, () => el('span', 'lamp')));
  lightsEl.hidden = false;
  nextStart();
}

function nextStart() {
  reflexStop();
  reflex.phase = 'ready';
  const lamps = [...$('lightsGantry').children];
  lamps.forEach((l) => l.classList.remove('on'));
  lightsEl.classList.remove('foul', 'go');
  $('lightsInfo').textContent = `🚦 Départ ${reflex.times.length + 1} / ${REFLEX_TRIES}`;
  $('lightsTime').textContent = '';
  $('lightsMsg').textContent = 'Tape dès que les feux s’éteignent !';
  lamps.forEach((l, i) => reflexLater(() => {
    reflex.phase = 'arm';
    l.classList.add('on');
    tonePlay(330);
  }, 900 + i * 650));
  const out = 900 + 4 * 650 + rand(700, 2400);
  reflexLater(() => {
    lamps.forEach((l) => l.classList.remove('on'));
    reflex.phase = 'go';
    reflex.t0 = performance.now();
    lightsEl.classList.add('go');
    $('lightsMsg').textContent = 'GO ! 🏁';
  }, out);
  // trop lent : le départ est compté au bout de 2 s
  reflexLater(() => { if (reflex.phase === 'go') lightsTap(); }, out + 2000);
}

function lightsTap(e) {
  if (e) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); }
  if (lightsEl.hidden) return;
  if (reflex.phase === 'arm') {
    // faux départ : on a tapé pendant que les feux étaient allumés
    reflexStop();
    reflex.phase = 'shown';
    reflex.times.push(null);
    lightsEl.classList.add('foul');
    $('lightsTime').textContent = '🚩';
    $('lightsMsg').textContent = 'Faux départ ! Attends que tout s’éteigne 😉';
    sfx.bad();
    buzz(80);
  } else if (reflex.phase === 'go') {
    const ms = Math.round(performance.now() - reflex.t0);
    reflex.phase = 'shown';
    reflex.times.push(ms);
    $('lightsTime').textContent = fmtSec(ms);
    $('lightsMsg').textContent = ms < 300 ? 'Fusée ! 🚀' : (ms < 420 ? 'Beau départ ! 🏎️' : (ms < 2000 ? 'Un peu endormi… 😴' : 'Il a calé… 😅'));
    if (ms < 420) sfx.coin(); else sfx.tap();
  } else return;
  if (reflex.times.length >= REFLEX_TRIES) reflexLater(endLights, 1400);
  else reflexLater(nextStart, 1500);
}
lightsEl.addEventListener('pointerdown', lightsTap);
document.addEventListener('keydown', (e) => { if (!lightsEl.hidden && (e.key === ' ' || e.key === 'Enter')) lightsTap(e); });

function endLights() {
  reflexStop();
  reflex.phase = 'over';
  const valid = reflex.times.filter((t) => t !== null);
  const best = valid.length ? Math.min(...valid) : 0;
  const stars = !best ? 1 : (best < 330 ? 3 : (best < 450 ? 2 : 1));
  const record = best > 0 && (!state.bestLights || best < state.bestLights);
  if (record) state.bestLights = best;
  $('lightsInfo').textContent = `${'⭐'.repeat(stars)} ${best ? 'meilleur départ ' + fmtSec(best) : 'que des faux départs'}${record ? ' · record !' : ''}`;
  $('lightsTime').textContent = best ? fmtSec(best) : '🚩';
  $('lightsMsg').textContent = stars === 3 ? 'Des réflexes de champion 🏆' : (stars === 2 ? 'Bon pilote ! 🏁' : 'On s’entraîne encore un peu 💪');
  rewardGame({ id: 'lights', activity: 'game_lights', stars, happy: stars * 4, love: 2, energy: -3, pers: 'sport', persPts: 2, label: 'aux Feux de départ' });
  endGameLater(() => { lightsEl.hidden = true; lightsEl.classList.remove('foul', 'go'); }, 2600);
}

registerMini({ el: lightsEl, stop: () => { reflexStop(); reflex.phase = 'over'; } });
$('pickLights').addEventListener('click', () => { gamesModal.hidden = true; if (!canAct()) return toast('Attends la fin de sa visite 😍'); startLights(); });
