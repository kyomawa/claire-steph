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
    await ctx.addInitScript('window.__noHelp = true; window.__noVisits = true;');
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

    // Grand Prix du jour : classement, points, compétences
    await p.waitForTimeout(2600);
    await idle(p);
    await p.click('#raceNo');
    await p.click('#careerBody .gp-card .btn');
    await p.waitForTimeout(500);
    await p.evaluate(() => { race.score = 20; race.t = 39.9; });
    await p.waitForFunction(() => Object.keys(state.career.gp).length === 1, null, { timeout: 5000 });
    const gp = await p.evaluate(() => Object.values(state.career.gp)[0]);
    assert.ok(gp.place >= 1 && gp.place <= 10 && gp.points >= 0);
    ok('Grand Prix du jour');

    // sauvegarde + rechargement (y compris carrière et compétences)
    await p.waitForTimeout(2800);
    const saved = await p.evaluate(() => { saveNow(); return [state.xp, state.career.races, Math.round(state.skills.pilotage)]; });
    await p.reload();
    await p.waitForTimeout(800);
    assert.deepStrictEqual(await p.evaluate(() => [state.xp, state.career.races, Math.round(state.skills.pilotage)]), saved);
    ok('sauvegarde et rechargement (carrière comprise)');

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

    // sauvegarde abîmée (valeurs impossibles) : le jeu la répare au chargement
    const broken = await open('?heure=15', { ...STATE, hunger: null, energy: 'abc', happy: 999, weight: -5, poops: [1, 'x', null] });
    assert.deepStrictEqual(await broken.evaluate(() => [Number.isFinite(state.hunger), Number.isFinite(state.energy), state.happy, state.weight, state.poops.length]), [true, true, 100, 45, 1]);
    ok('sauvegarde abîmée réparée');

    // quitter un mini-jeu sans le finir
    const q = await open('?heure=15', STATE);
    await idle(q);
    await q.click('#btnGame');
    await q.click('#pickMemory');
    await q.waitForTimeout(1200);
    assert.ok(await q.isVisible('#quitGame'));
    await q.click('#quitGame');
    assert.deepStrictEqual(await q.evaluate(() => [game.active, busy, memEl.hidden]), [false, false, true]);
    ok('quitter un mini-jeu');

    // chien de garde : une action figée se débloque toute seule
    await q.evaluate(() => { busy = true; actionVisual.classList.add('show'); });
    await q.evaluate(() => { busySince = Date.now() - 26000; });
    await q.waitForTimeout(1300);
    assert.strictEqual(await q.evaluate(() => busy), false);
    ok('chien de garde');

    // Échap ferme seulement la fenêtre du dessus
    await q.click('#btnBook');
    await q.evaluate(() => { statusModal.hidden = false; });
    await q.waitForTimeout(100);
    await q.keyboard.press('Escape');
    assert.deepStrictEqual(await q.evaluate(() => [statusModal.hidden, book.hidden]), [true, false]);
    await q.keyboard.press('Escape');
    assert.strictEqual(await q.evaluate(() => book.hidden), true);
    ok('Échap ferme la fenêtre du dessus');

    // tutoriel : avance quand on fait l'action demandée
    const t = await open('?heure=15', { ...STATE, xp: 0 });
    await t.waitForTimeout(900);
    assert.ok((await t.textContent('#coachText')).startsWith('1/3'));
    await idle(t);
    await t.evaluate(() => feed(MENU[1]));
    await t.waitForTimeout(2600);
    assert.ok((await t.textContent('#coachText')).startsWith('2/3'));
    ok('tutoriel des premiers pas');

    // réglages et tutoriel passé : conservés après rechargement
    await t.click('#coachSkip');
    await t.click('#btnSettings');
    await t.click('#prefVibrate');
    await t.click('#prefMotion');
    await t.click('#saveClose');
    await t.evaluate(() => saveNow());
    await t.reload();
    await t.waitForTimeout(900);
    assert.deepStrictEqual(await t.evaluate(() => [state.tutorial, state.vibrate, state.reduceMotion, document.documentElement.classList.contains('reduce-motion')]), ['done', false, true, true]);
    assert.ok(!(await t.isVisible('#coachTip')), 'tutoriel passé : plus de bulle');
    ok('réglages conservés');

    assert.deepStrictEqual(errors, [], 'aucune erreur JavaScript');
    ok('aucune erreur JavaScript');
    console.log(`\n${n} tests de bout en bout OK`);
  } catch (e) {
    console.error('✗', e.message.split('\n').slice(0, 14).join('\n'));
    console.error((e.stack || '').split('\n').find((l) => l.includes('e2e.test.js')));
    process.exitCode = 1;
  } finally {
    await browser.close();
    srv.close();
  }
})();
