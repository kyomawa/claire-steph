// =====================================================================
//  Sons (synthé rétro) + vibrations
// =====================================================================
const sfx = (() => {
  let ctx = null;
  function tone(freq, dur, type, vol, when) {
    if (state.sound === false) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime + (when || 0);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol || 0.04, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (e) { /* pas de son */ }
  }
  const seq = (notes, type, vol) => notes.forEach(([f, d, w]) => tone(f, d, type, vol, w));
  return {
    tap: () => tone(880, 0.05, 'square', 0.025),
    purr: () => tone(rand(180, 230), 0.08, 'triangle', 0.05),
    kiss: () => seq([[988, 0.07, 0], [1319, 0.12, 0.07]], 'square', 0.03),
    eat: () => seq([[330, 0.06, 0], [262, 0.06, 0.09], [330, 0.08, 0.18]], 'triangle', 0.07),
    happy: () => seq([[523, 0.07, 0], [659, 0.07, 0.08], [784, 0.13, 0.16]], 'square', 0.03),
    giggle: () => seq([[784, 0.05, 0], [988, 0.05, 0.07], [784, 0.05, 0.14], [1175, 0.08, 0.21]], 'square', 0.03),
    level: () => seq([[523, 0.09, 0], [659, 0.09, 0.1], [784, 0.09, 0.2], [1047, 0.25, 0.3]], 'square', 0.035),
    coin: () => seq([[988, 0.05, 0], [1319, 0.16, 0.05]], 'square', 0.03),
    bad: () => tone(150, 0.18, 'sawtooth', 0.035),
    pop: () => tone(660, 0.08, 'sine', 0.05),
    alert: () => seq([[880, 0.08, 0], [660, 0.08, 0.12], [880, 0.1, 0.24]], 'square', 0.03)
  };
})();
function buzz(pattern) {
  try { if (state.sound !== false && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignoré */ }
}
function renderSoundBtn() {
  $('btnSound').textContent = state.sound === false ? '🔇' : '🔊';
  $('btnSound').setAttribute('aria-label', state.sound === false ? 'Activer le son' : 'Couper le son');
}
$('btnSound').addEventListener('click', () => {
  state.sound = state.sound === false;
  renderSoundBtn();
  saveState();
  sfx.pop();
});

// ---- +12 / -8 qui s'envolent à côté des jauges ----
const snap = () => ({ hunger: state.hunger, energy: state.energy, happy: state.happy, love: state.love });
function showDeltas(before) {
  for (const k of ['hunger', 'energy', 'happy', 'love']) {
    const d = Math.round(state[k] - before[k]);
    if (!d) continue;
    const row = $('bar-' + k).closest('.stat-row');
    const t = el('span', 'delta ' + (d > 0 ? 'up' : 'down'), (d > 0 ? '+' : '') + d);
    row.appendChild(t);
    setTimeout(() => t.remove(), 1500);
  }
}
