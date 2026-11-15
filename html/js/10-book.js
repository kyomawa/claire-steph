// =====================================================================
//  Carnet
// =====================================================================
const book = $('book');
const bookBody = $('bookBody');
let bookTab = 'trophies';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function renderBook() {
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === bookTab)));
  bookBody.replaceChildren();

  if (bookTab === 'trophies') {
    const got = TROPHIES.filter((t) => state.trophies[t.id]).length;
    bookBody.appendChild(el('p', 'empty', `${got} / ${TROPHIES.length} trophées`));
    const grid = el('div', 'trophies');
    for (const t of TROPHIES) {
      const on = !!state.trophies[t.id];
      const card = el('div', 'trophy' + (on ? '' : ' locked'));
      card.append(el('div', 't-emoji', on ? t.e : '🔒'), el('div', 't-title', t.t), el('div', '', t.d));
      if (on) card.appendChild(el('div', 'm-date', formatDate(state.trophies[t.id])));
      grid.appendChild(card);
    }
    bookBody.appendChild(grid);
  }

  if (bookTab === 'memories') {
    if (!state.journal.length) {
      bookBody.appendChild(el('p', 'empty', 'Pas encore de souvenirs… reviens demain pour le mot du jour 💌'));
    } else {
      const list = el('ul', 'memories');
      for (const m of [...state.journal].reverse()) {
        const li = el('li', m.kind === 'special' ? 'special' : (m.kind === 'answer' ? 'answer' : ''));
        li.append(el('span', 'm-date', formatDate(m.d)), document.createTextNode(m.msg));
        list.appendChild(li);
      }
      bookBody.appendChild(list);
    }
  }

  if (bookTab === 'cards') {
    const got = POSTCARDS.filter(([c]) => state.postcards[c]).length;
    bookBody.appendChild(el('p', 'empty', `${got} / ${POSTCARDS.length} cartes postales · une par escapade à deux ✈️`));
    const grid = el('div', 'postcards');
    for (const [city, e] of POSTCARDS) {
      const d = state.postcards[city];
      const card = el('div', 'postcard' + (d ? '' : ' locked'));
      card.append(el('span', 'pc-emoji', d ? e : '✉️'), el('span', 'pc-city', d ? city : '???'), el('span', 'pc-date', d ? formatDate(d) : 'Escapade à deux'));
      grid.appendChild(card);
    }
    bookBody.appendChild(grid);
    const photos = loadPhotos();
    bookBody.appendChild(el('p', 'empty', photos.length ? `📷 ${photos.length} photo${photos.length > 1 ? 's' : ''} souvenir (bouton 📸 en haut)` : '📷 Pas encore de photo : bouton 📸 en haut'));
    if (photos.length) {
      const pg = el('div', 'photos');
      for (const ph of [...photos].reverse()) { const im = el('img'); im.src = ph.src; im.alt = 'Photo du ' + formatDate(ph.d); pg.appendChild(im); }
      bookBody.appendChild(pg);
    }
  }

  if (bookTab === 'album') {
    const got = MOMENTS.filter((m) => state.album[m.id]).length;
    bookBody.appendChild(el('p', 'empty', `${got} / ${MOMENTS.length} moments à deux`));
    const grid = el('div', 'album');
    for (const m of MOMENTS) {
      const a = state.album[m.id];
      const card = el('div', 'a-card' + (a ? '' : ' locked'));
      const img = el('img');
      img.src = sceneOf(m.id);
      img.alt = '';
      card.append(img, el('div', 't-title', a ? m.n : '???'),
        el('div', 'm-date', a ? `${a.n} fois · depuis le ${formatDate(a.since)}` : (m.auto || 'Avec le bouton « À deux »')));
      grid.appendChild(card);
    }
    bookBody.appendChild(grid);
  }

  if (bookTab === 'stats') {
    const c = state.counters;
    const rows = [
      [CONFIG.coupleStart ? '💑 Jours ensemble' : '🗓️ Jours de jeu', daysTogether()],
      ['⭐ Niveau', `${levelFor(state.xp)} (${state.xp} XP)`],
      ['🔥 Série en cours', `${state.streak} j`],
      ['🎮 Record mini-jeu', state.bestScore],
      ['🥰 Câlins', c.hugs], ['💋 Bisous', c.kisses], ['🍽️ Repas', c.meals],
      ['🧼 Bains', c.washes], ['💩 Cacas ramassés', c.cleaned], ['💑 Moments à deux', c.moments],
      ['🤲 Caresses', c.strokes], ['😂 Chatouilles', c.tickles], ['🧞 Envies exaucées', c.wishes], ['🔮 Record gauche/droite', `${state.bestGuess} / 5`],
      ['🧠 Record Mémoire', state.bestMemory ? `${state.bestMemory} coups` : '—'], ['🪩 Record Danse', `${state.bestDance} pts`],
      ['🎾 Balles rapportées', c.fetches], ['📸 Selfies', c.selfies],
      ['🏁 Rang', rankFor(levelFor(state.xp))], ['⛽ Jetons', state.tokens || 0], ['✈️ Cartes postales', Object.keys(state.postcards || {}).length], ['🏎️ Record Course', `${state.bestRace || 0} pts`], ['💌 Mots doux reçus', c.notesGot],
      ['🏃 Runs', c.runs], ['💻 Sessions de code', c.codes], ['😴 Siestes', c.sleeps],
      ['💊 Soins', c.heals], ['🚶‍♀️ Visites', c.visits], ['🎮 Parties', c.games]
    ];
    const table = el('table', 'stat-table');
    for (const [k, v] of rows) {
      const tr = el('tr');
      tr.append(el('td', '', k), el('td', '', String(v)));
      table.appendChild(tr);
    }
    bookBody.appendChild(table);
  }
}

$('btnBook').addEventListener('click', () => { renderBook(); book.hidden = false; $('bookClose').focus(); });
$('bookClose').addEventListener('click', () => { book.hidden = true; });
book.addEventListener('click', (e) => { if (e.target === book) book.hidden = true; });
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { bookTab = t.dataset.tab; renderBook(); }));
