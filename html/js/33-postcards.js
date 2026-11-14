// =====================================================================
//  Cartes postales (escapades)
// =====================================================================
const POSTCARDS = [
  ['Paris', '🗼'], ['Rome', '🏛️'], ['Londres', '💂'], ['Barcelone', '⛱️'], ['Lisbonne', '🚋'], ['Amsterdam', '🌷'],
  ['Le Mans', '🏁'], ['Monaco', '🏎️'], ['New York', '🗽'], ['Tokyo', '🗾'], ['Marrakech', '🕌'], ['Santorin', '🌅'],
  ['Montréal', '🍁'], ['Bali', '🌴'], ['Reykjavik', '🌌'], ['Venise', '🛶']
];
function sendPostcard() {
  const left = POSTCARDS.filter(([c]) => !state.postcards[c]);
  const [city, e] = left.length ? pick(left) : pick(POSTCARDS);
  const fresh = !state.postcards[city];
  if (fresh) state.postcards[city] = dayKey(now());
  setTimeout(() => toast(fresh ? `✈️ Nouvelle carte postale : ${city} ${e}` : `✈️ Retour à ${city} ${e}`), 2900);
  if (fresh) addMemory(`✈️ Escapade à ${city} ${e}`, 'special');
}
