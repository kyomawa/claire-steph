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

  const CIRCUITS = [
    { id: 'lemans', name: 'Le Mans', flag: '🇫🇷', icon: '🏁' },
    { id: 'monaco', name: 'Monaco', flag: '🇲🇨', icon: '🏎️' },
    { id: 'spa', name: 'Spa-Francorchamps', flag: '🇧🇪', icon: '🌲' },
    { id: 'silverstone', name: 'Silverstone', flag: '🇬🇧', icon: '☔' },
    { id: 'monza', name: 'Monza', flag: '🇮🇹', icon: '🍕' },
    { id: 'suzuka', name: 'Suzuka', flag: '🇯🇵', icon: '🗾' },
    { id: 'daytona', name: 'Daytona', flag: '🇺🇸', icon: '🌴' }
  ];
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

  // Performance du pilote : compétences + course jouée + forme du jour
  function performance(skills, gameScore, energy, rnd) {
    const r = rnd || Math.random;
    let p = 0.45 * skills.pilotage + 0.25 * skills.endurance + 0.1 * skills.charme;
    p += Math.min(45, gameScore * 1.5);
    if (energy < 40) p -= 10;
    p += (r() - 0.5) * 16;
    return p;
  }

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

  // Enregistre le résultat d'un Grand Prix et met à jour la saison
  function recordGP(s, dayKey, circuit, place, points) {
    ensure(s);
    const c = s.career;
    const month = dayKey.slice(0, 7);
    let archived = null;
    if (c.season.month && c.season.month !== month) {
      archived = { ...c.season };
      c.seasons.push(archived);
      c.season = { month, points: 0, races: 0, wins: 0, podiums: 0 };
    }
    if (!c.season.month) c.season.month = month;
    c.gp[dayKey] = { circuit: circuit.id, place, points };
    c.races++; c.season.races++; c.season.points += points;
    c.circuits[circuit.id] = (c.circuits[circuit.id] || 0) + 1;
    if (place <= 3) { c.podiums++; c.season.podiums++; }
    if (place === 1) { c.wins++; c.season.wins++; c.winsAt[circuit.id] = (c.winsAt[circuit.id] || 0) + 1; }
    return archived;
  }

  // Titre de fin de saison selon les points du mois
  function seasonTitle(points) {
    if (points >= 300) return 'Champion du monde 🏆';
    if (points >= 180) return 'Vice-champion 🥈';
    if (points >= 90) return 'Pilote confirmé 🏁';
    return 'Saison d’apprentissage 🔰';
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

  return { SKILLS, TRAINING, DAILY_CAP, CIRCUITS, RIVALS, POINTS, CHAPTERS, STREAK_REWARDS, ensure, train, circuitOfDay, performance, rivals, classify, recordGP, seasonTitle, nextChapters, sample, weekReport, streakReward, dayIndex };
}));
