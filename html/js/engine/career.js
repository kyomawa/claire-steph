/*
 * Chéri-o-tchi — carrière de pilote (règles pures, sans DOM) :
 * compétences, Grand Prix du jour, championnat mensuel, chapitres de l'histoire,
 * bilan de la semaine, récompenses de connexion. Voir docs/GAME_DESIGN.md §11-14.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CheriCareer = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SKILLS = {
    pilotage: { name: 'Pilotage', icon: '🏎️' },
    endurance: { name: 'Endurance', icon: '💪' },
    cuisine: { name: 'Cuisine', icon: '🍳' },
    code: { name: 'Code', icon: '💻' },
    charme: { name: 'Charme', icon: '💘' }
  };
  const DAILY_CAP = 6;          // points max par compétence et par jour

  // Ce que chaque activité entraîne
  const TRAINING = {
    runs: { endurance: 2, pilotage: 0.5 },
    codes: { code: 2 },
    meals: { cuisine: 0.3 },
    hugs: { charme: 1 },
    moment_sport: { endurance: 3 },
    moment_cuisine: { cuisine: 3 },
    moment_love: { charme: 1.5 },
    moment_party: { charme: 1, endurance: 1 },
    game_race: { pilotage: 2 },
    game_dance: { charme: 1, endurance: 1 },
    game_memory: { code: 1 },
    game_guess: { charme: 0.5 },
    game_catch: { endurance: 0.5 },
    game_bugs: { code: 2 },
    game_recipe: { cuisine: 2, charme: 0.5 },
    game_lights: { pilotage: 1.5 },
    fetches: { endurance: 0.5 },
    notes: { charme: 1 }
  };

  // Chaque circuit a son caractère : poids des compétences (somme 0,85), pièce de la voiture
  // qui compte le plus, risque de pluie (%), vitesse de la course, ambiance
  const CIRCUITS = [
    { id: 'lemans', name: 'Le Mans', flag: '🇫🇷', icon: '🏁', trait: 'Course de nuit : l’endurance compte double', w: { pilotage: 0.35, endurance: 0.4, charme: 0.1 }, part: 'fiabilite', rain: 25, speed: 1, night: true },
    { id: 'monaco', name: 'Monaco', flag: '🇲🇨', icon: '🏎️', trait: 'Rues étroites entre les murs : le pilotage avant tout', w: { pilotage: 0.6, endurance: 0.15, charme: 0.1 }, part: 'pneus', rain: 15, speed: 0.92, walls: true },
    { id: 'spa', name: 'Spa-Francorchamps', flag: '🇧🇪', icon: '🌲', trait: 'Météo capricieuse : la pluie arrive souvent', w: { pilotage: 0.45, endurance: 0.3, charme: 0.1 }, part: 'aero', rain: 50, speed: 1.08 },
    { id: 'silverstone', name: 'Silverstone', flag: '🇬🇧', icon: '🏰', trait: 'Rapide, et souvent mouillé', w: { pilotage: 0.45, endurance: 0.3, charme: 0.1 }, part: 'aero', rain: 40, speed: 1.05 },
    { id: 'monza', name: 'Monza', flag: '🇮🇹', icon: '🍕', trait: 'Le temple de la vitesse : le moteur fait tout', w: { pilotage: 0.4, endurance: 0.25, charme: 0.2 }, part: 'moteur', rain: 15, speed: 1.2 },
    { id: 'suzuka', name: 'Suzuka', flag: '🇯🇵', icon: '🗾', trait: 'Technique : la piste est pleine d’obstacles', w: { pilotage: 0.55, endurance: 0.2, charme: 0.1 }, part: 'pneus', rain: 25, speed: 1, busy: true },
    { id: 'daytona', name: 'Daytona', flag: '🇺🇸', icon: '🌴', trait: 'Ovale à fond : moteur et aspiration', w: { pilotage: 0.35, endurance: 0.3, charme: 0.2 }, part: 'moteur', rain: 10, speed: 1.15 }
  ];
  const DEFAULT_W = { pilotage: 0.45, endurance: 0.25, charme: 0.1 };

  // ---- La voiture (garage) ----
  const PARTS = {
    moteur: { name: 'Moteur', icon: '🔧', desc: 'Plus de vitesse en ligne droite' },
    pneus: { name: 'Pneus', icon: '⚫', desc: 'Plus d’adhérence dans les virages' },
    aero: { name: 'Aileron', icon: '🌬️', desc: 'Plus d’appui dans les courbes rapides' },
    fiabilite: { name: 'Fiabilité', icon: '🔩', desc: 'Tient la distance sur les longues courses' }
  };
  const PART_COSTS = [30, 60, 100, 150, 220];   // prix des niveaux 1 → 5
  const PART_MAX = PART_COSTS.length;

  // ---- Pneus (choisis avant chaque Grand Prix) ----
  const TIRES = {
    tendres: { name: 'Tendres', icon: '🔴', dry: 6, wet: -10, speed: 1.12, desc: 'Les plus rapides sur le sec (la course va plus vite)' },
    durs: { name: 'Durs', icon: '⚪', dry: 2, wet: -6, speed: 1, desc: 'Sûrs et réguliers' },
    pluie: { name: 'Pluie', icon: '🔵', dry: -8, wet: 8, speed: 0.94, desc: 'Indispensables quand il pleut' }
  };
  const SEASON_REWARDS = [150, 100, 70, 40, 40, 40, 20, 20, 20, 20];

  const RIVALS = ['Vitesse Vincent', 'Turbo Tom', 'Nitro Nina', 'Drift Dylan', 'Max Pneus', 'Lola Lumière', 'Hugo Hybride', 'Ricky Ravito', 'Sam Slick'];
  const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

  const CHAPTERS = [
    { id: 'c1', title: 'Le rêve', icon: '📸', reward: 10, need: () => true,
      text: 'En rangeant, il retrouve une vieille photo : une voiture bleu poudre à bande orange, au Mans. « Un jour, c’est moi qui serai au volant. »' },
    { id: 'c2', title: 'Premier tour de piste', icon: '🏎️', reward: 15, need: (c) => c.races >= 1,
      text: 'Son premier Grand Prix ! Les mains moites sur le volant, il entend quelqu’un crier son nom dans les tribunes. C’est elle. 💕' },
    { id: 'c3', title: 'Le goût du podium', icon: '🥉', reward: 25, need: (c) => c.podiums >= 1,
      text: 'Une coupe dans les mains, le sourire jusqu’aux oreilles. « Ce n’est que le début. »' },
    { id: 'c4', title: 'Le pilote du dimanche n’existe plus', icon: '💪', reward: 30, need: (c, lvl, sk) => sk.pilotage >= 30 && sk.endurance >= 30,
      text: 'Entraînements, footing, bons petits plats : il ne se reconnaît plus. Son écurie le remarque.' },
    { id: 'c5', title: 'L’écurie Gulf appelle', icon: '📞', reward: 40, need: (c, lvl) => c.wins >= 1 && lvl >= 6,
      text: 'Le téléphone sonne : « Ici l’écurie bleu et orange. On a vu votre victoire. Vous seriez prêt pour Le Mans ? »' },
    { id: 'c6', title: 'Monaco by night', icon: '🌃', reward: 40, need: (c) => c.circuits.monaco >= 1 && c.podiums >= 3,
      text: 'Les lumières de Monaco, le port, la foule. Il a gagné sa place parmi les grands.' },
    { id: 'c7', title: 'Les 24 Heures', icon: '🏆', reward: 100, need: (c) => (c.winsAt.lemans || 0) >= 1,
      text: 'Le Mans. La nuit, la pluie, puis le soleil. Il franchit la ligne en tête. Le rêve de la photo est devenu réalité… et elle est là, sur le podium, avec lui.' }
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dayIndex = (dayKey) => Math.floor(new Date(dayKey + 'T12:00:00Z').getTime() / 86400000);

  function ensure(s) {
    if (!s.skills || typeof s.skills !== 'object') s.skills = {};
    for (const k of Object.keys(SKILLS)) if (typeof s.skills[k] !== 'number') s.skills[k] = 0;
    if (!s.skillDay || typeof s.skillDay !== 'object') s.skillDay = { day: null, gained: {} };
    if (!s.career || typeof s.career !== 'object') s.career = {};
    const c = s.career;
    for (const k of ['races', 'wins', 'podiums']) if (typeof c[k] !== 'number') c[k] = 0;
    if (!c.circuits) c.circuits = {};
    if (!c.winsAt) c.winsAt = {};
    if (!c.gp) c.gp = {};
    if (!c.season) c.season = { month: null, points: 0, races: 0, wins: 0, podiums: 0 };
    if (!Array.isArray(c.seasons)) c.seasons = [];
    if (!c.chapters) c.chapters = {};
    if (typeof c.rainWins !== 'number') c.rainWins = 0;
    if (c.season.month && (!c.season.rivals || typeof c.season.rivals !== 'object')) c.season.rivals = rebuildRivals(c);
    if (!s.car || typeof s.car !== 'object') s.car = {};
    for (const k of Object.keys(PARTS)) if (typeof s.car[k] !== 'number' || !(s.car[k] >= 0)) s.car[k] = 0; else s.car[k] = clamp(Math.floor(s.car[k]), 0, PART_MAX);
    if (!s.history || typeof s.history !== 'object') s.history = {};
    return s;
  }

  // Entraîne les compétences liées à une activité (plafond quotidien, plus dur en haut de l'échelle)
  function train(s, activity, dayKey, mult) {
    ensure(s);
    const t = TRAINING[activity];
    if (!t) return {};
    if (s.skillDay.day !== dayKey) s.skillDay = { day: dayKey, gained: {} };
    const out = {};
    for (const [k, base] of Object.entries(t)) {
      const room = DAILY_CAP - (s.skillDay.gained[k] || 0);
      if (room <= 0) continue;
      const gain = Math.min(room, base * (mult || 1) * (1 - s.skills[k] / 150));
      if (gain <= 0) continue;
      s.skills[k] = clamp(s.skills[k] + gain, 0, 100);
      s.skillDay.gained[k] = (s.skillDay.gained[k] || 0) + gain;
      out[k] = gain;
    }
    return out;
  }

  function circuitOfDay(dayKey) { return CIRCUITS[((dayIndex(dayKey) % CIRCUITS.length) + CIRCUITS.length) % CIRCUITS.length]; }

  // Bonus de la voiture : chaque niveau compte partout, la pièce clé du circuit compte en plus
  function carBonus(car, circuit) {
    if (!car) return 0;
    const total = Object.keys(PARTS).reduce((a, k) => a + (car[k] || 0), 0);
    const key = circuit && circuit.part ? (car[circuit.part] || 0) : 0;
    return Math.round((total * 0.7 + key * 1.2) * 10) / 10;
  }
  function tireBonus(tire, weather) { const t = TIRES[tire]; return t ? (weather === 'pluie' ? t.wet : t.dry) : 0; }
  function bestTire(weather) { return weather === 'pluie' ? 'pluie' : 'tendres'; }
  // Météo de la course : la même toute la journée, la pluie plus fréquente à Spa ou Silverstone
  function gpWeather(dayKey, circuit) {
    const h = ((dayIndex(dayKey) + 7) * 2654435761) >>> 0;
    return h % 100 < ((circuit && circuit.rain) || 0) ? 'pluie' : 'sec';
  }
  function upgradeCost(level) { return level < PART_MAX ? PART_COSTS[level] : null; }
  function upgrade(s, part) {
    ensure(s);
    if (!PARTS[part]) return null;
    const lvl = s.car[part];
    const cost = upgradeCost(lvl);
    if (cost === null || (s.tokens || 0) < cost) return null;
    s.tokens -= cost;
    s.car[part] = lvl + 1;
    return { part, level: lvl + 1, cost };
  }

  // Performance du pilote : compétences (selon le circuit) + course jouée + voiture + pneus + forme + chance
  function performanceDetail(skills, gameScore, energy, rnd, o) {
    const r = rnd || Math.random;
    const w = (o && o.circuit && o.circuit.w) || DEFAULT_W;
    const parts = {
      skills: w.pilotage * skills.pilotage + w.endurance * skills.endurance + w.charme * skills.charme,
      course: Math.min(45, gameScore * 1.5),
      car: o ? carBonus(o.car, o.circuit) : 0,
      tires: o ? tireBonus(o.tire, o.weather) : 0,
      form: energy < 40 ? -10 : 0,
      luck: (r() - 0.5) * 16
    };
    return { total: Object.values(parts).reduce((a, v) => a + v, 0), parts };
  }
  function performance(skills, gameScore, energy, rnd, o) { return performanceDetail(skills, gameScore, energy, rnd, o).total; }

  // Les rivaux progressent au fil du mois (manche n°1, 2, 3…)
  function rivals(round, rnd) {
    const r = rnd || Math.random;
    return RIVALS.map((name, i) => ({ name, perf: 18 + i * 7 + Math.min(round, 12) * 1.5 + (r() - 0.5) * 16 }));
  }

  function classify(perf, round, rnd) {
    const field = rivals(round, rnd).concat([{ name: 'lui', perf, me: true }]).sort((a, b) => b.perf - a.perf);
    const place = field.findIndex((x) => x.me) + 1;
    return { place, points: POINTS[place - 1] || 0, field };
  }

  // Petit générateur pseudo-aléatoire reproductible (pour reconstituer d'anciennes courses)
  function seeded(seed) { let x = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
  const zeroRivals = () => Object.fromEntries(RIVALS.map((n) => [n, 0]));
  // Points des rivaux à une course : ils prennent les places que le pilote n'a pas prises
  function addRivalPoints(rv, field, place, round, dayKey) {
    if (Array.isArray(field)) {
      field.forEach((d, i) => { if (!d.me) rv[d.name] = (rv[d.name] || 0) + (POINTS[i] || 0); });
      return;
    }
    const order = rivals(round, seeded(dayIndex(dayKey))).sort((a, b) => b.perf - a.perf);
    let pos = 1;
    for (const d of order) {
      if (pos === place) pos++;
      rv[d.name] = (rv[d.name] || 0) + (POINTS[pos - 1] || 0);
      pos++;
    }
  }
  // Saison commencée avant le classement des rivaux : on rejoue ses courses
  function rebuildRivals(c) {
    const rv = zeroRivals();
    Object.keys(c.gp || {}).filter((d) => d.startsWith(c.season.month)).sort()
      .forEach((d, i) => addRivalPoints(rv, null, c.gp[d].place, i + 1, d));
    return rv;
  }
  // Classement du championnat (à égalité, il passe devant)
  function standings(s) {
    ensure(s);
    const c = s.career;
    const rv = c.season.rivals || zeroRivals();
    const rows = RIVALS.map((name) => ({ name, pts: rv[name] || 0 }));
    rows.push({ name: 'lui', pts: c.season.points, me: true });
    return rows.sort((a, b) => b.pts - a.pts || (a.me ? -1 : (b.me ? 1 : 0)));
  }
  function myPosition(s) { return standings(s).findIndex((x) => x.me) + 1; }
  // Le rival du moment : celui juste devant (ou le 2ᵉ s'il mène)
  function rivalOf(s) {
    const st = standings(s);
    const i = st.findIndex((x) => x.me);
    if (!s.career.season.races) return null;
    if (i > 0) return { name: st[i - 1].name, gap: st[i - 1].pts - st[i].pts, ahead: true };
    return { name: st[1].name, gap: st[0].pts - st[1].pts, ahead: false };
  }

  // Titre de fin de saison selon la place au championnat
  function seasonTitleFor(pos) {
    if (pos === 1) return 'Champion du monde 🏆';
    if (pos === 2) return 'Vice-champion 🥈';
    if (pos === 3) return 'Podium du championnat 🥉';
    if (pos <= 6) return 'Pilote confirmé 🏁';
    return 'Saison d’apprentissage 🔰';
  }
  // (anciennes saisons, sans classement : selon les points)
  function seasonTitle(points) {
    if (points >= 300) return 'Champion du monde 🏆';
    if (points >= 180) return 'Vice-champion 🥈';
    if (points >= 90) return 'Pilote confirmé 🏁';
    return 'Saison d’apprentissage 🔰';
  }
  // Nouveau mois : la saison précédente est archivée avec sa place, son titre et sa récompense
  function rollSeason(s, dayKey) {
    ensure(s);
    const c = s.career;
    const month = dayKey.slice(0, 7);
    if (!c.season.month || c.season.month === month) return null;
    const st = standings(s);
    const pos = st.findIndex((x) => x.me) + 1;
    const archived = { month: c.season.month, points: c.season.points, races: c.season.races, wins: c.season.wins, podiums: c.season.podiums, pos, title: seasonTitleFor(pos), reward: c.season.races ? SEASON_REWARDS[pos - 1] : 0, top: st.slice(0, 3).map((x) => (x.me ? 'lui' : x.name)) };
    c.seasons.push(archived);
    if (c.seasons.length > 24) c.seasons.shift();
    c.season = { month, points: 0, races: 0, wins: 0, podiums: 0, rivals: zeroRivals() };
    return archived;
  }

  // Enregistre le résultat d'un Grand Prix et met à jour la saison
  function recordGP(s, dayKey, circuit, place, points, field, o) {
    ensure(s);
    const c = s.career;
    const archived = rollSeason(s, dayKey);
    if (!c.season.month) c.season.month = dayKey.slice(0, 7);
    if (!c.season.rivals) c.season.rivals = zeroRivals();
    c.gp[dayKey] = { circuit: circuit.id, place, points };
    if (o && o.weather) c.gp[dayKey].weather = o.weather;
    c.races++; c.season.races++; c.season.points += points;
    addRivalPoints(c.season.rivals, field, place, c.season.races, dayKey);
    c.circuits[circuit.id] = (c.circuits[circuit.id] || 0) + 1;
    if (place <= 3) { c.podiums++; c.season.podiums++; }
    if (place === 1) {
      c.wins++; c.season.wins++; c.winsAt[circuit.id] = (c.winsAt[circuit.id] || 0) + 1;
      if (o && o.weather === 'pluie') c.rainWins++;
    }
    return archived;
  }

  // Palmarès : meilleur résultat sur chaque circuit
  function palmares(s) {
    ensure(s);
    const best = {};
    for (const g of Object.values(s.career.gp)) if (g && (!best[g.circuit] || g.place < best[g.circuit])) best[g.circuit] = g.place;
    return CIRCUITS.map((ci) => ({ id: ci.id, name: ci.name, flag: ci.flag, best: best[ci.id] || null, races: s.career.circuits[ci.id] || 0, wins: s.career.winsAt[ci.id] || 0 }));
  }

  function nextChapters(s, level) {
    ensure(s);
    return CHAPTERS.filter((ch) => !s.career.chapters[ch.id] && ch.need(s.career, level, s.skills));
  }

  // ---- Bilan de la semaine ----
  // Bien-être mesuré heure par heure (même pendant les absences, via le rattrapage)
  function sample(s, dayKey, hour, wellbeing) {
    ensure(s);
    const h = s.history[dayKey] || (s.history[dayKey] = { hours: {} });
    if (!h.hours) h.hours = {};
    h.hours[hour] = Math.round(wellbeing);
    const keys = Object.keys(s.history).sort();
    while (keys.length > 21) delete s.history[keys.shift()];
  }

  function weekReport(s, endDayKey, mistakes7) {
    ensure(s);
    const end = new Date(endDayKey + 'T12:00:00Z');
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10);
      const vals = Object.values((s.history[d] && s.history[d].hours) || {});
      days.push({ day: d, value: vals.length ? Math.round(vals.reduce((a, v) => a + v, 0) / vals.length) : null });
    }
    const played = days.filter((d) => d.value !== null);
    const avg = played.length ? Math.round(played.reduce((a, d) => a + d.value, 0) / played.length) : 0;
    let grade = 'D';
    if (played.length >= 4 && avg >= 80 && mistakes7 <= 1) grade = 'S';
    else if (played.length >= 3 && avg >= 70 && mistakes7 <= 3) grade = 'A';
    else if (avg >= 55) grade = 'B';
    else if (avg >= 40) grade = 'C';
    const reward = { S: 40, A: 30, B: 20, C: 10, D: 5 }[grade];
    return { days, avg, grade, reward, played: played.length };
  }

  // ---- Connexion quotidienne : jetons selon la série ----
  const STREAK_REWARDS = [5, 5, 10, 10, 15, 15, 40];
  function streakReward(streak) { return STREAK_REWARDS[(Math.max(1, streak) - 1) % 7]; }

  return { SKILLS, TRAINING, DAILY_CAP, CIRCUITS, RIVALS, POINTS, CHAPTERS, STREAK_REWARDS, PARTS, PART_COSTS, PART_MAX, TIRES, SEASON_REWARDS, ensure, train, circuitOfDay, performance, performanceDetail, carBonus, tireBonus, bestTire, gpWeather, upgradeCost, upgrade, rivals, classify, recordGP, rollSeason, standings, myPosition, rivalOf, seasonTitle, seasonTitleFor, palmares, nextChapters, sample, weekReport, streakReward, dayIndex };
}));
