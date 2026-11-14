// =====================================================================
//  Outils
// =====================================================================
const A = window.ASSETS;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Pour tester : ?heure=23 (nuit) ou ?date=07-08 (date spéciale)
function now() {
  const d = new Date();
  if (params.get('date')) {
    const [m, j] = params.get('date').split('-').map(Number);
    if (m && j) d.setMonth(m - 1, j);
  }
  if (params.has('heure')) d.setHours(Number(params.get('heure')) || 0);
  return d;
}
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mdKey = (d) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const clamp = (v) => Math.max(0, Math.min(100, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function phaseAt(hour) {
  if (hour >= 22 || hour < 7) return 'night';
  if (hour >= 19) return 'dusk';
  return 'day';
}
const phase = () => phaseAt(now().getHours());
const isNight = () => phase() === 'night';
const Sim = window.CheriSim;
// heure « décimale » d'un instant (respecte ?heure=… pour les tests)
const hourOfTs = (t) => (params.has('heure') ? (Number(params.get('heure')) || 0) + 0.25 : new Date(t).getHours() + new Date(t).getMinutes() / 60);

function formatDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
