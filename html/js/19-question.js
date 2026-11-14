// =====================================================================
//  Question du jour
// =====================================================================
const QUESTIONS = [
  ['Pizza ou burger ?', ['Pizza 🍕', 'Burger 🍔'], ['Team pizza, je valide 🍕', 'Burger, évidemment 🍔']],
  ['Mer ou montagne ?', ['Mer 🌊', 'Montagne 🏔️'], ['Direction la plage ! 🏖️', 'Chalet et raclette 🧀']],
  ['Film ou série ce soir ?', ['Film 🎬', 'Série 📺'], ['Je prépare le pop-corn 🍿', 'Encore un épisode… 😏']],
  ['Câlin ou bisou ?', ['Câlin 🫂', 'Bisou 💋'], ['Viens là 🫂', 'Mwah 💋']],
  ['Café ou thé ?', ['Café ☕', 'Thé 🍵'], ['Double expresso ! ⚡', 'Tout en douceur 🍵']],
  ['Chat ou chien ?', ['Chat 🐱', 'Chien 🐶'], ['Miaou 😼', 'Ouaf ! 🐶']],
  ['Lève-tôt ou couche-tard ?', ['Lève-tôt 🌅', 'Couche-tard 🌙'], ['Grasse mat interdite 😅', 'Les nuits sont faites pour vivre 🌙']],
  ['Resto ou cuisine maison ?', ['Resto 🍽️', 'Maison 🍲'], ['Je réserve ! 📞', "Je mets mon tablier 👨‍🍳"]],
  ['Été ou hiver ?', ['Été ☀️', 'Hiver ❄️'], ['Soleil et tongs 🩴', 'Plaid et chocolat chaud ☕']],
  ['Sucré ou salé ?', ['Sucré 🍫', 'Salé 🥨'], ['Un carré de chocolat ? 🍫', 'Apéro ! 🥨']],
  ['Circuit ou balade ?', ['Circuit 🏎️', 'Balade 🌳'], ['Vroum vroum, couleurs Gulf ! 🏁', 'Main dans la main 🌳']],
  ['Plage ou piscine ?', ['Plage 🏖️', 'Piscine 🏊'], ['Sable partout 😂', 'Plouf ! 💦']],
  ['Jeux vidéo ou jeux de société ?', ['Jeux vidéo 🎮', 'Société 🎲'], ['Prépare-toi à perdre 😏', 'Je mélange les cartes 🃏']],
  ['Petit-déj au lit ou brunch ?', ['Au lit 🥐', 'Brunch 🥞'], ['Croissants au lit 🥐', 'Pancakes à volonté 🥞']],
  ['Danse ou karaoké ?', ['Danse 💃', 'Karaoké 🎤'], ['On met le son ! 🪩', 'Je chante faux mais fort 🎤']],
  ['Tu m’aimes comment ?', ['Beaucoup 💕', 'Passionnément 🔥'], ['Moi aussi 🥰', 'À la folie 😍']],
  ['Week-end : grasse mat ou aventure ?', ['Grasse mat 😴', 'Aventure 🗺️'], ['Personne ne bouge 😴', 'Sac à dos prêt ! 🎒']],
  ['Plutôt Noël ou anniversaire ?', ['Noël 🎄', 'Anniversaire 🎂'], ['Le sapin c’est la vie 🎄', 'Des bougies pour moi ? 🎂']]
];
const askEl = $('ask');
let sessionStart = Date.now();
const questionOfDay = () => QUESTIONS[Math.floor(new Date(dayKey(now())).getTime() / DAY_MS) % QUESTIONS.length];

function maybeAsk() {
  if (!askEl.hidden || state.lastAsk === dayKey(now()) || himMode() !== 'normal' || busy || Date.now() - sessionStart < 20000) return;
  const [q, answers, reactions] = questionOfDay();
  $('askQ').textContent = q;
  $('askBtns').replaceChildren(...answers.map((a, i) => {
    const b = el('button', 'ask-btn', a);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      askEl.hidden = true;
      state.lastAsk = dayKey(now());
      state.counters.answers++;
      const before = snap();
      state.love = clamp(state.love + 4);
      state.happy = clamp(state.happy + 3);
      addMemory(`${q} → ${a}`, 'answer');
      showBubble(reactions[i], 2200);
      flashMood(A.himHappy, 2000);
      sfx.happy();
      gainXp(4);
      renderStats();
      showDeltas(before);
      checkTrophies();
    });
    return b;
  }));
  askEl.hidden = false;
  sfx.pop();
}
