// Test « singe » : des centaines de tapes au hasard dans plusieurs situations.
// Vérifie qu'aucune erreur JavaScript ne survient et que le jeu ne reste jamais bloqué.
//   node tests/monkey.test.js [secondes par scénario]
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cheriotchi-monkey-'));
const { createServer } = require('../server/server.js');
const { chromium } = require('playwright');

const SECONDS = Number(process.argv[2]) || 20;
const BASE_STATE = { hunger: 60, energy: 70, happy: 60, love: 60, lastSeen: Date.now(), lastVisitDay: '2099-01-01', xp: 900, seenHelp: true, tokens: 200, wear: { tete: 'capGulf', compagnon: 'petDog' } };
const SCENARIOS = [
  ['jour', '?heure=15', BASE_STATE],
  ['nuit', '?heure=23', BASE_STATE],
  ['malade et sale', '?heure=11', { ...BASE_STATE, sick: true, poops: [20, 50, 80], hunger: 10 }],
  ['boudeur fatigué', '?heure=18', { ...BASE_STATE, love: 5, energy: 10 }],
  ['tout neuf', '?heure=9', null]
];

function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

(async () => {
  const srv = createServer();
  await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  let failures = 0;
  for (const [name, query, st] of SCENARIOS) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    if (st) await ctx.addInitScript(`if(!sessionStorage.x){sessionStorage.x=1;localStorage.setItem('cheriotchi_state', ${JSON.stringify(JSON.stringify(st))})}`);
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/push|Failed to load resource|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
    await p.goto(base + query);
    await p.waitForTimeout(1200);
    const rnd = seeded(name.length * 7919);
    const end = Date.now() + SECONDS * 1000;
    let taps = 0, maxBusy = 0, busySince = 0;
    while (Date.now() < end) {
      const target = await p.evaluate((r) => {
        const visible = (e) => { const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 4 && b.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && !e.disabled && b.bottom > 0 && b.top < innerHeight; };
        const pool = [...document.querySelectorAll('button, .w-item, .m-card, .mem-card, .tab, #sprite, #pet, .poop, #ball, .drag-food, #screen, #mood, #raceNo, summary')].filter(visible);
        const e = pool[Math.floor(r * pool.length)];
        if (!e) return null;
        const b = e.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2, id: e.id || e.className };
      }, rnd());
      if (target) {
        const roll = rnd();
        if (roll < 0.08) await p.keyboard.press('Escape');
        else if (roll < 0.14) { await p.mouse.move(target.x, target.y); await p.mouse.down(); await p.mouse.move(target.x + 40, target.y - 30, { steps: 4 }); await p.mouse.up(); }
        else await p.mouse.click(target.x, target.y);
        taps++;
      }
      await p.waitForTimeout(40 + rnd() * 120);
      const busy = await p.evaluate(() => busy || game.active);
      if (busy) { if (!busySince) busySince = Date.now(); maxBusy = Math.max(maxBusy, Date.now() - busySince); } else busySince = 0;
    }
    // laisse finir ce qui est en cours, puis vérifie qu'on n'est pas coincé
    await p.waitForTimeout(3000);
    const stuck = await p.evaluate(() => {
      // termine un éventuel mini-jeu en cours
      if (typeof race !== 'undefined' && race.on && !race.over) { race.t = 99; }
      return null;
    });
    await p.waitForTimeout(3500);
    const state = await p.evaluate(() => ({ busy, active: game.active, nan: ['hunger', 'energy', 'happy', 'love', 'weight', 'discipline'].filter((k) => !Number.isFinite(state[k])) }));
    const ok = !errors.length && !state.nan.length && maxBusy < 60000;
    if (!ok) failures++;
    console.log(`${ok ? '✓' : '✗'} ${name} : ${taps} tapes, blocage max ${Math.round(maxBusy / 1000)} s${state.busy || state.active ? ' (encore occupé à la fin)' : ''}${state.nan.length ? ', valeurs invalides : ' + state.nan : ''}`);
    for (const e of [...new Set(errors)].slice(0, 6)) console.log('    ', e);
    await ctx.close();
  }
  await browser.close();
  srv.close();
  if (failures) { console.log(`\n✗ ${failures} scénario(s) en échec`); process.exitCode = 1; } else console.log('\nTest singe OK');
})();
