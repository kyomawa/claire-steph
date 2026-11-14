// =====================================================================
//  Météo du jour
// =====================================================================
function weatherToday() {
  const d = now();
  const m = d.getMonth() + 1;
  if (m === 12 || m <= 2) return 'snow';
  const n = Math.floor(new Date(dayKey(d)).getTime() / DAY_MS);
  const r = ((n * 2654435761) >>> 0) % 100;
  const rainy = (m >= 9 && m <= 11) || (m >= 3 && m <= 4) ? 35 : 18;
  return r < rainy ? 'rain' : 'sun';
}
let rainTimer = null;
function applyWeather() {
  const w = weatherToday();
  const ph = phase();
  screenEl.classList.toggle('rain', w === 'rain');
  $('sun').hidden = !(w === 'sun' && ph === 'day');
  if (w === 'rain' && !rainTimer) {
    rainTimer = setInterval(() => {
      if (document.hidden) return;
      for (let i = 0; i < 3; i++) {
        const d = el('div', 'drop');
        d.style.left = rand(0, 100) + '%';
        d.style.animationDuration = rand(0.55, 0.85) + 's';
        screenEl.appendChild(d);
        setTimeout(() => d.remove(), 900);
      }
    }, 120);
  }
}
function weatherComment() {
  const w = weatherToday();
  if (w === 'rain') return pick(['Il pleut… on reste au chaud ? ☔', 'Temps parfait pour un plaid 🌧️', 'Même sous la pluie je souris 😊☔']);
  if (w === 'snow') return pick(['Il neige ! ❄️', 'Bataille de boules de neige ? ⛄']);
  return null;
}
