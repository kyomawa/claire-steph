// Tests unitaires du moteur de simulation : node tests/sim.test.js
const assert = require('assert');
const Sim = require('../html/js/engine/sim.js');

const H = Sim.HOUR;
const at = (h) => Date.UTC(2026, 10, 14, 0, 0) + h * H;          // heures en « UTC » pour des tests stables
const hourOf = (t) => { const d = new Date(t); return d.getUTCHours() + d.getUTCMinutes() / 60; };
const fresh = (over) => Sim.ensure({ hunger: 80, energy: 80, happy: 80, love: 80, poops: [], ...over });
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg} : ${a} ≠ ${b}`);
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('✓', name); };

test('les besoins baissent selon les règles en journée', () => {
  const s = fresh();
  Sim.simulate(s, at(9), at(13), { hourOf, random: () => 0.5 });
  near(s.hunger, 80 - 4 * 7, 0.01, 'faim');
  near(s.energy, 80 - 4 * 5, 0.01, 'énergie');
  near(s.happy, 80 - 4 * 4, 0.01, 'bonheur');
  near(s.love, 80 - 4 * 3, 0.01, 'amour');
});

test('même résultat en un seul gros rattrapage ou en petits pas', () => {
  const a = fresh(), b = fresh();
  Sim.simulate(a, at(9), at(15), { hourOf });
  for (let t = at(9); t < at(15); t += 7 * 60 * 1000) Sim.simulate(b, t, Math.min(t + 7 * 60 * 1000, at(15)), { hourOf });
  near(a.hunger, b.hunger, 0.01, 'faim');
  near(a.energy, b.energy, 0.01, 'énergie');
});

test('la nuit il dort et récupère, moins bien si la lumière reste allumée', () => {
  const off = fresh({ energy: 20, lights: false }), on = fresh({ energy: 20, lights: true });
  Sim.simulate(off, at(23), at(27), { hourOf });
  Sim.simulate(on, at(23), at(27), { hourOf });
  near(off.energy, 20 + 4 * 12, 0.01, 'énergie lumière éteinte');
  near(on.energy, 20 + 4 * 6, 0.01, 'énergie lumière allumée');
  assert.ok(on.mistakes.some((m) => m.k === 'lights'), 'lumière oubliée = soin oublié');
  assert.ok(!off.mistakes.length, 'lumière éteinte : aucun soin oublié');
});

test('au réveil la lumière se rallume', () => {
  const s = fresh({ lights: false });
  const ev = Sim.simulate(s, at(6), at(8.5), { hourOf });
  assert.ok(ev.some((e) => e.type === 'wake'));
  assert.strictEqual(s.lights, true);
});

test('un repas donne un caca 1 h à 2 h 30 plus tard', () => {
  const s = fresh();
  Sim.eat(s, at(10), 0.5, () => 0);
  Sim.simulate(s, at(10), at(10.9), { hourOf });
  assert.strictEqual(s.poops.length, 0, 'pas encore');
  Sim.simulate(s, at(10.9), at(11.2), { hourOf });
  assert.strictEqual(s.poops.length, 1, 'caca après 1 h');
  near(s.weight, 70.5 - 0.06, 0.02, 'poids');
});

test('un appel ignoré 45 min devient un soin oublié, une seule fois', () => {
  const s = fresh({ hunger: 14 });
  const ev = Sim.simulate(s, at(10), at(12), { hourOf });
  assert.ok(ev.some((e) => e.type === 'alert' && e.key === 'hunger'));
  assert.strictEqual(s.mistakes.filter((m) => m.k === 'hunger').length, 1);
});

test('un appel réglé à temps ne compte pas', () => {
  const s = fresh({ hunger: 14 });
  Sim.simulate(s, at(10), at(10.5), { hourOf });
  s.hunger = 80;
  Sim.simulate(s, at(10.5), at(12), { hourOf });
  assert.strictEqual(s.mistakes.length, 0);
  assert.ok(!s.alerts.hunger);
});

test('affamé 2 h → malade', () => {
  const s = fresh({ hunger: 0 });
  const ev = Sim.simulate(s, at(10), at(12.2), { hourOf });
  assert.ok(s.sick && ev.some((e) => e.type === 'sick' && e.why === 'hunger'));
});

test('3 cacas au sol pendant 1 h → malade', () => {
  const s = fresh({ poops: [10, 40, 70], hunger: 90 });
  Sim.simulate(s, at(10), at(11.2), { hourOf });
  assert.ok(s.sick);
});

test('la personnalité suit les activités dominantes', () => {
  const s = fresh();
  assert.strictEqual(Sim.personality(s), null, 'pas de personnalité au début');
  Sim.addActivity(s, 'sport', 12); Sim.addActivity(s, 'food', 11);
  assert.strictEqual(Sim.personality(s), 'zen', 'équilibré = zen');
  Sim.addActivity(s, 'sport', 18);
  assert.strictEqual(Sim.personality(s), 'sport');
  Sim.simulate(s, at(9), at(9 + 36), { hourOf });
  near(s.activity.sport, 15, 0.1, 'demi-vie de 36 h');
});

test('complicité : 5 cœurs moins 1 par tranche de 2 soins oubliés sur 7 jours', () => {
  const s = fresh();
  s.mistakes = [{ t: at(0), k: 'hunger' }, { t: at(1), k: 'love' }, { t: at(2), k: 'dirty' }];
  assert.strictEqual(Sim.bond(s, at(3)), 4);
  assert.strictEqual(Sim.bond(s, at(3 + 24 * 8)), 5);
});

test('rattrapage limité à 72 h', () => {
  const s = fresh();
  Sim.simulate(s, at(0), at(24 * 30), { hourOf });
  assert.ok(s.hunger === 0 && s.sick);
});

test('anti-farm des mini-jeux', () => {
  assert.deepStrictEqual([1, 3, 4, 6, 7, 20].map(Sim.playMultiplier), [1, 1, 0.5, 0.5, 0.25, 0.25]);
});

console.log(`\n${n} tests OK`);
