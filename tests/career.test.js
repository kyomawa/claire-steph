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

console.log(`\n${n} tests OK`);
