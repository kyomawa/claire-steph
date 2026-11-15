// Tests de la carrière : node tests/career.test.js
const assert = require('assert');
const C = require('../html/js/engine/career.js');

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('✓', name); };
const fixed = (v) => () => v;

test('les compétences montent avec les activités, plafonnées par jour', () => {
  const s = C.ensure({});
  C.train(s, 'runs', '2026-11-14');
  assert.ok(s.skills.endurance > 1.9 && s.skills.pilotage > 0.4);
  for (let i = 0; i < 20; i++) C.train(s, 'runs', '2026-11-14');
  assert.ok(Math.abs(s.skillDay.gained.endurance - C.DAILY_CAP) < 1e-9, 'plafond du jour');
  C.train(s, 'runs', '2026-11-15');
  assert.ok(s.skillDay.day === '2026-11-15' && s.skills.endurance > C.DAILY_CAP, 'nouveau jour, nouvelle marge');
});

test('chaque mini-jeu entraîne au moins une compétence', () => {
  for (const g of ['catch', 'memory', 'dance', 'race', 'guess', 'bugs', 'recipe', 'lights']) {
    const s = C.ensure({});
    const gains = C.train(s, 'game_' + g, 'd');
    assert.ok(Object.values(gains).some((v) => v > 0), g);
  }
  const s = C.ensure({});
  C.train(s, 'game_bugs', 'd'); C.train(s, 'game_recipe', 'd'); C.train(s, 'game_lights', 'd');
  assert.ok(s.skills.code > 1.9 && s.skills.cuisine > 1.9 && s.skills.pilotage > 1.4);
});

test('progresser est plus dur en haut de l’échelle', () => {
  const lo = C.ensure({}), hi = C.ensure({ skills: { endurance: 90 } });
  const a = C.train(lo, 'runs', 'd').endurance, b = C.train(hi, 'runs', 'd').endurance;
  assert.ok(b < a / 2);
});

test('un circuit différent chaque jour, en boucle', () => {
  const ids = new Set();
  for (let d = 1; d <= 7; d++) ids.add(C.circuitOfDay(`2026-11-${String(d).padStart(2, '0')}`).id);
  assert.strictEqual(ids.size, 7);
  assert.strictEqual(C.circuitOfDay('2026-11-01').id, C.circuitOfDay('2026-11-08').id);
});

test('un pilote fort et une belle course gagnent, un débutant finit loin', () => {
  const pro = C.performance({ pilotage: 90, endurance: 90, charme: 60 }, 30, 80, fixed(0.5));
  const rookie = C.performance({ pilotage: 0, endurance: 0, charme: 0 }, 3, 30, fixed(0.5));
  assert.strictEqual(C.classify(pro, 1, fixed(0.5)).place, 1);
  assert.ok(C.classify(rookie, 1, fixed(0.5)).place >= 9);
});

test('la course jouée compte vraiment', () => {
  const sk = { pilotage: 30, endurance: 30, charme: 20 };
  const bad = C.classify(C.performance(sk, 2, 80, fixed(0.5)), 1, fixed(0.5)).place;
  const good = C.classify(C.performance(sk, 28, 80, fixed(0.5)), 1, fixed(0.5)).place;
  assert.ok(good < bad, `${good} < ${bad}`);
});

test('saison : points, victoires, podiums, archivage au changement de mois', () => {
  const s = C.ensure({});
  const lm = C.CIRCUITS[0];
  C.recordGP(s, '2026-11-14', lm, 1, 25);
  C.recordGP(s, '2026-11-15', lm, 3, 15);
  assert.deepStrictEqual([s.career.season.points, s.career.season.wins, s.career.season.podiums, s.career.winsAt.lemans], [40, 1, 2, 1]);
  const arch = C.recordGP(s, '2026-12-01', lm, 10, 1);
  assert.strictEqual(arch.points, 40);
  assert.strictEqual(s.career.season.points, 1);
  assert.strictEqual(s.career.seasons.length, 1);
});

test('chapitres débloqués selon la progression', () => {
  const s = C.ensure({});
  assert.deepStrictEqual(C.nextChapters(s, 1).map((c) => c.id), ['c1']);
  s.career.chapters.c1 = 'x';
  C.recordGP(s, '2026-11-14', C.CIRCUITS[0], 1, 25);
  assert.deepStrictEqual(C.nextChapters(s, 6).map((c) => c.id), ['c2', 'c3', 'c5', 'c7']);
});

test('bilan de la semaine : note et récompense', () => {
  const s = C.ensure({});
  for (let d = 8; d <= 14; d++) { C.sample(s, `2026-11-${String(d).padStart(2, "0")}`, 10, 80); C.sample(s, `2026-11-${String(d).padStart(2, "0")}`, 14, 90); }
  const r = C.weekReport(s, '2026-11-14', 0);
  assert.deepStrictEqual([r.grade, r.reward, r.played, r.avg], ['S', 40, 7, 85]);
  const r2 = C.weekReport(s, '2026-11-14', 5);
  assert.strictEqual(r2.grade, 'B');
  const empty = C.weekReport(C.ensure({}), '2026-11-14', 0);
  assert.strictEqual(empty.grade, 'D');
});

test('récompenses de connexion sur 7 jours, gros bonus le 7ᵉ', () => {
  assert.deepStrictEqual([1, 2, 3, 7, 8, 14].map(C.streakReward), [5, 5, 10, 40, 5, 40]);
});

test('chaque circuit a son caractère (poids, pièce clé, pluie)', () => {
  for (const ci of C.CIRCUITS) {
    const sum = ci.w.pilotage + ci.w.endurance + ci.w.charme;
    assert.ok(Math.abs(sum - 0.85) < 1e-9, ci.id);
    assert.ok(C.PARTS[ci.part], ci.id);
    assert.ok(ci.trait && ci.rain >= 0 && ci.speed > 0.8);
  }
  const sk = { pilotage: 80, endurance: 10, charme: 10 };
  const monaco = C.CIRCUITS.find((c) => c.id === 'monaco'), lemans = C.CIRCUITS.find((c) => c.id === 'lemans');
  const pm = C.performanceDetail(sk, 0, 80, fixed(0.5), { circuit: monaco }).parts.skills;
  const pl = C.performanceDetail(sk, 0, 80, fixed(0.5), { circuit: lemans }).parts.skills;
  assert.ok(pm > pl + 15, 'un gros pilotage brille à Monaco');
});

test('performance détaillée : la somme des parts, sans changement sans options', () => {
  const sk = { pilotage: 30, endurance: 30, charme: 20 };
  const d = C.performanceDetail(sk, 20, 30, fixed(0.75), { circuit: C.CIRCUITS[4], car: { moteur: 3, pneus: 1, aero: 0, fiabilite: 0 }, tire: 'tendres', weather: 'sec' });
  const sum = Object.values(d.parts).reduce((a, v) => a + v, 0);
  assert.ok(Math.abs(sum - d.total) < 1e-9);
  assert.deepStrictEqual([d.parts.car, d.parts.tires, d.parts.form, d.parts.luck], [6.4, 6, -10, 4]);
  assert.strictEqual(C.performance(sk, 20, 80, fixed(0.5)), 0.45 * 30 + 0.25 * 30 + 0.1 * 20 + 30);
});

test('pneus : le bon choix selon la météo', () => {
  assert.deepStrictEqual([C.tireBonus('pluie', 'pluie'), C.tireBonus('tendres', 'pluie'), C.tireBonus('tendres', 'sec'), C.tireBonus('pluie', 'sec')], [8, -10, 6, -8]);
  assert.deepStrictEqual([C.bestTire('pluie'), C.bestTire('sec')], ['pluie', 'tendres']);
  const spa = C.CIRCUITS.find((c) => c.id === 'spa'), daytona = C.CIRCUITS.find((c) => c.id === 'daytona');
  let wetSpa = 0, wetDay = 0;
  for (let d = 1; d <= 200; d++) {
    const key = new Date(Date.UTC(2026, 0, d)).toISOString().slice(0, 10);
    assert.strictEqual(C.gpWeather(key, spa), C.gpWeather(key, spa), 'même météo toute la journée');
    if (C.gpWeather(key, spa) === 'pluie') wetSpa++;
    if (C.gpWeather(key, daytona) === 'pluie') wetDay++;
  }
  assert.ok(wetSpa > 70 && wetSpa < 130 && wetDay < 40, `${wetSpa} / ${wetDay}`);
});

test('garage : prix croissants, niveau max, jetons dépensés', () => {
  const s = C.ensure({ tokens: 150 });
  assert.deepStrictEqual(C.upgrade(s, 'pneus'), { part: 'pneus', level: 1, cost: 30 });
  assert.deepStrictEqual(C.upgrade(s, 'pneus'), { part: 'pneus', level: 2, cost: 60 });
  assert.strictEqual(C.upgrade(s, 'pneus'), null, 'pas assez de jetons (100 pour le niveau 3)');
  assert.deepStrictEqual([s.tokens, s.car.pneus], [60, 2]);
  s.car.moteur = 5; s.tokens = 9999;
  assert.strictEqual(C.upgrade(s, 'moteur'), null, 'niveau max');
  assert.strictEqual(C.upgrade(s, 'turbo'), null);
  const bad = C.ensure({ car: { moteur: 'x', pneus: 12, aero: -3 } });
  assert.deepStrictEqual(bad.car, { moteur: 0, pneus: 5, aero: 0, fiabilite: 0 });
});

test('championnat : les rivaux marquent aussi, classement et rival du moment', () => {
  const s = C.ensure({});
  const res = C.classify(60, 1, fixed(0.5));
  C.recordGP(s, '2026-11-14', C.CIRCUITS[0], res.place, res.points, res.field);
  const st = C.standings(s);
  assert.strictEqual(st.reduce((a, x) => a + x.pts, 0), 101, 'tous les points de la course sont distribués');
  assert.strictEqual(C.myPosition(s), res.place);
  const rv = C.rivalOf(s);
  if (res.place > 1) assert.ok(rv.ahead && rv.gap >= 0); else assert.ok(!rv.ahead);
  // sans classement fourni, il est reconstitué (et reproductible)
  const a = C.ensure({}), b = C.ensure({});
  C.recordGP(a, '2026-11-15', C.CIRCUITS[0], 4, 12);
  C.recordGP(b, '2026-11-15', C.CIRCUITS[0], 4, 12);
  assert.deepStrictEqual(C.standings(a), C.standings(b));
  assert.strictEqual(C.myPosition(a), 4);
});

test('ancienne saison sans rivaux : leurs points sont reconstitués', () => {
  const s = { career: { races: 2, wins: 1, podiums: 2, circuits: {}, winsAt: {}, chapters: {}, seasons: [], gp: { '2026-11-02': { circuit: 'monaco', place: 1, points: 25 }, '2026-11-03': { circuit: 'spa', place: 3, points: 15 } }, season: { month: '2026-11', points: 40, races: 2, wins: 1, podiums: 2 } } };
  C.ensure(s);
  assert.strictEqual(C.standings(s).reduce((a, x) => a + x.pts, 0), 202);
});

test('fin de saison : place, titre, récompense, nouvelle saison', () => {
  const s = C.ensure({});
  C.recordGP(s, '2026-11-14', C.CIRCUITS[0], 1, 25, null);
  C.recordGP(s, '2026-11-15', C.CIRCUITS[1], 1, 25, null);
  assert.strictEqual(C.rollSeason(s, '2026-11-30'), null, 'même mois');
  const arch = C.rollSeason(s, '2026-12-01');
  assert.deepStrictEqual([arch.month, arch.pos, arch.title, arch.reward, arch.top[0]], ['2026-11', 1, 'Champion du monde 🏆', 150, 'lui']);
  assert.deepStrictEqual([s.career.season.month, s.career.season.points, C.myPosition(s)], ['2026-12', 0, 1]);
  assert.strictEqual(C.rollSeason(s, '2026-12-02'), null);
  assert.deepStrictEqual([C.seasonTitleFor(2), C.seasonTitleFor(5), C.seasonTitleFor(9)], ['Vice-champion 🥈', 'Pilote confirmé 🏁', 'Saison d’apprentissage 🔰']);
});

test('palmarès par circuit et victoires sous la pluie', () => {
  const s = C.ensure({});
  C.recordGP(s, '2026-11-10', C.CIRCUITS[2], 5, 10, null, { weather: 'pluie' });
  C.recordGP(s, '2026-11-17', C.CIRCUITS[2], 1, 25, null, { weather: 'pluie' });
  const spa = C.palmares(s).find((x) => x.id === 'spa');
  assert.deepStrictEqual([spa.best, spa.races, spa.wins, s.career.rainWins, s.career.gp['2026-11-17'].weather], [1, 2, 1, 1, 'pluie']);
});

console.log(`\n${n} tests OK`);
