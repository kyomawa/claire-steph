// Tests de bout en bout (navigateur réel) : node tests/e2e.test.js
// Nécessite Playwright avec Chromium (préinstallé dans l'environnement de dev).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cheriotchi-'));
const { createServer } = require('../server/server.js');
const { chromium } = require('playwright');

const STATE = { hunger: 70, energy: 80, happy: 70, love: 70, lastSeen: Date.now(), lastVisitDay: '2099-01-01', xp: 600, seenHelp: true, wear: { tete: 'capGulf', compagnon: 'petDog' } };
let n = 0;
const ok = (name) => { n++; console.log('✓', name); };

(async () => {
  const srv = createServer();
  await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  const errors = [];
  const open = async (query, state) => {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 1000 } });
    await ctx.addInitScript('window.__noHelp = true');
    if (state) await ctx.addInitScript(`if(!sessionStorage.x){sessionStorage.x=1;localStorage.setItem('cheriotchi_state', ${JSON.stringify(JSON.stringify(state))})}`);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(base + query);
    await p.waitForTimeout(800);
    return p;
  };
  const idle = (p) => p.waitForFunction(() => !busy && !girlBusy, null, { timeout: 30000 });

  try {
    // démarrage à neuf : l'aide s'affiche, pas d'erreur
    {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errors.push(e.message));
      await p.goto(base + '?heure=15');
      await p.waitForTimeout(1300);
      assert.ok(await p.isVisible('#help'), 'aide au premier lancement');
      await ctx.close();
      ok('premier lancement');
    }

    // repas : poids + digestion
    const p = await open('?heure=15', STATE);
    await idle(p);
    await p.evaluate(() => feed(MENU.find((m) => m.id === 'burger')));
    assert.deepStrictEqual(await p.evaluate(() => [+(state.weight).toFixed(1), state.digestQueue.length]), [70.6, 1]);
    ok('repas : poids et digestion');

    // appel à l'attention → badge + statut
    await p.waitForTimeout(1800);
    await idle(p);
    await p.evaluate(() => { state.hunger = 10; lastTickAt = Date.now() - 1000; tick(); });
    assert.ok(await p.isVisible('#alertBadge'), 'badge visible');
    await p.click('#alertBadge');
    assert.ok((await p.textContent('#statusBody')).includes('Il a faim'));
    await p.click('#statusClose');
    await p.evaluate(() => { state.hunger = 60; renderStats(); });
    assert.ok(!(await p.isVisible('#alertBadge')), 'badge retiré dès que c’est réglé');
    ok('appel à l’attention et statut');

    // caprice → sagesse
    await idle(p);
    await p.evaluate(() => { const r = Math.random; Math.random = () => 0.0001; maybeCaprice(); Math.random = r; });
    await p.click('#capriceNo');
    assert.strictEqual(await p.evaluate(() => state.discipline), 60);
    ok('caprice et sagesse');

    // anti-farm
    assert.deepStrictEqual(await p.evaluate(() => [1, 2, 3, 4].map(() => playMult('x'))), [1, 1, 1, 0.5]);
    ok('anti-farm des mini-jeux');

    // mini-jeu course : fin de partie, récompenses
    await idle(p);
    const tokens = await p.evaluate(() => state.tokens || 0);
    await p.click('#btnGame');
    await p.click('#pickRace');
    await p.waitForTimeout(500);
    await p.evaluate(() => { race.score = 20; race.t = 39.9; });
    await p.waitForFunction(() => race.over, null, { timeout: 5000 });
    assert.ok((await p.evaluate(() => state.tokens)) > tokens, 'jetons gagnés');
    ok('mini-jeu Course Gulf');

    // sauvegarde + rechargement
    await p.waitForTimeout(2600);
    const xp = await p.evaluate(() => { saveNow(); return state.xp; });
    await p.reload();
    await p.waitForTimeout(800);
    assert.strictEqual(await p.evaluate(() => state.xp), xp);
    ok('sauvegarde et rechargement');

    // nuit : lumière
    const night = await open('?heure=23', STATE);
    assert.ok((await night.textContent('#btnSleep')).includes('Éteindre'));
    await night.click('#btnSleep');
    assert.strictEqual(await night.evaluate(() => state.lights), false);
    ok('la nuit : éteindre la lumière');

    // absence : le temps a passé, soins oubliés comptés
    const away = await open('?heure=15', { ...STATE, hunger: 20, lastSeen: Date.now() - 4 * 3600e3 });
    await away.waitForTimeout(1200);
    assert.ok(await away.evaluate(() => state.hunger < 5 && state.mistakes.some((m) => m.k === 'hunger')));
    ok('rattrapage d’absence');

    assert.deepStrictEqual(errors, [], 'aucune erreur JavaScript');
    ok('aucune erreur JavaScript');
    console.log(`\n${n} tests de bout en bout OK`);
  } catch (e) {
    console.error('✗', e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    srv.close();
  }
})();
