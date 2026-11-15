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

    // nouveaux mini-jeux : partie complète, record et compétence entraînée
    const g = await open('?heure=15', { ...STATE, tutorial: 'done' });
    await idle(g);
    await g.click('#btnGame');
    assert.strictEqual(await g.locator('.g-card.is-new').count(), 3, 'trois jeux marqués « nouveau »');
    await g.click('#pickBugs');
    await g.waitForTimeout(1500);
    await g.evaluate(() => { const c = bugHunt.cells[4]; c.kind = BUG_KINDS[0]; c.until = performance.now() + 5000; c.b.classList.add('up'); });
    await g.click('#bugsGrid .bug-cell >> nth=4');
    assert.strictEqual(await g.evaluate(() => bugHunt.score), 1, 'un bug écrasé = 1 point');
    await g.evaluate(() => { bugHunt.end = performance.now(); });
    await g.waitForFunction(() => !game.active && !busy, null, { timeout: 10000 });
    assert.deepStrictEqual(await g.evaluate(() => [state.bestBugs, bugsEl.hidden, state.skills.code > 0]), [1, true, true]);
    ok('mini-jeu Chasse aux bugs');

    await g.click('#btnGame');
    await g.click('#pickRecipe');
    await g.waitForFunction(() => cook.phase === 'play', null, { timeout: 10000 });
    await g.evaluate(() => cook.seq.forEach((k) => pressPad(k)));
    await g.waitForFunction(() => cook.phase === 'play' && cook.round === 2, null, { timeout: 10000 });
    await g.evaluate(() => pressPad((cook.seq[0] + 1) % 4));
    await g.waitForFunction(() => !game.active && !busy, null, { timeout: 10000 });
    assert.deepStrictEqual(await g.evaluate(() => [state.bestRecipe, state.skills.cuisine > 0]), [1, true]);
    ok('mini-jeu Recette à deux');

    await g.click('#btnGame');
    await g.click('#pickLights');
    for (let i = 0; i < 3; i++) {
      await g.waitForFunction(() => reflex.phase === 'arm', null, { timeout: 10000 });
      if (i === 1) { await g.mouse.click(200, 300); continue; }       // faux départ
      await g.evaluate(() => { reflexStop(); reflex.phase = 'go'; reflex.t0 = performance.now() - 300; });
      await g.mouse.click(200, 300);
    }
    await g.waitForFunction(() => !game.active && !busy, null, { timeout: 10000 });
    const lt = await g.evaluate(() => [reflex.times[1], state.bestLights, state.skills.pilotage > 0]);
    assert.strictEqual(lt[0], null, 'faux départ compté');
    assert.ok(lt[1] >= 300 && lt[1] < 400 && lt[2], 'meilleur temps enregistré');
    ok('mini-jeu Feux de départ');

    // quitter un nouveau mini-jeu : rien ne reste en route
    await g.click('#btnGame');
    await g.click('#pickBugs');
    await g.waitForTimeout(600);
    await g.click('#quitGame');
    await g.waitForTimeout(300);
    assert.deepStrictEqual(await g.evaluate(() => [game.active, busy, bugsEl.hidden, bugHunt.over]), [false, false, true, true]);
    ok('quitter un nouveau mini-jeu');

    // un minuteur de fin d'une partie quittée ne coupe pas la partie suivante
    await g.evaluate(() => { endGameLater(() => {}, 400); quitGame(); });
    await g.click('#btnGame');
    await g.click('#pickRecipe');
    await g.waitForTimeout(700);
    assert.deepStrictEqual(await g.evaluate(() => [game.active, recipeEl.hidden]), [true, false]);
    await g.click('#quitGame');
    ok('parties bien séparées');

    // pastilles : le bouton utile s'allume
    await g.evaluate(() => { state.hunger = 20; state.poops = [30]; state.alerts = { sick: { since: Date.now(), counted: false } }; state.sick = true; renderStats(); });
    assert.deepStrictEqual(await g.evaluate(() => ['btnCoffee', 'btnWash', 'btnHeal'].map((id) => [$(id).classList.contains('need'), $(id).classList.contains('need-urgent')])), [[true, false], [true, false], [true, true]]);
    await g.evaluate(() => { state.hunger = 80; state.poops = []; state.alerts = {}; state.sick = false; renderStats(); });
    assert.strictEqual(await g.locator('.buttons .btn.need').count(), 0);
    ok('pastilles sur les boutons');

    // explications du HUD
    await g.click('#hudLevel');
    assert.ok((await g.textContent('#hudTip')).includes('XP pour le niveau'));
    await g.click('#hudStreak');
    assert.ok((await g.textContent('#hudTip')).includes('Demain'));
    ok('explications du HUD');

    // résumé d'absence (plus de 3 h)
    const aw = await open('?heure=15', { ...STATE, tutorial: 'done', hunger: 40, lastSeen: Date.now() - 6 * 3600e3 });
    await aw.waitForTimeout(900);
    assert.ok(await aw.isVisible('#awayModal'), 'résumé affiché');
    assert.ok((await aw.textContent('#awayTitle')).includes('6 h'));
    assert.ok((await aw.textContent('#awayBody')).includes('Faim'));
    ok('résumé d’absence');

    // calendrier de l'Avent : seulement en décembre, une case par jour
    const nov = await open('?heure=15&date=11-20', STATE);
    assert.ok(!(await nov.isVisible('#btnAdvent')), 'pas de calendrier en novembre');
    const adv = await open('?heure=15&date=12-03', STATE);
    await adv.waitForTimeout(900);          // laisse passer le bonus de série du démarrage
    assert.ok(await adv.isVisible('#btnAdvent'));
    await adv.click('#btnAdvent');
    const before = await adv.evaluate(() => state.tokens || 0);
    await adv.click('#adventGrid .advent-door >> nth=0');
    assert.strictEqual(await adv.evaluate(() => state.tokens || 0), before + 10);
    assert.deepStrictEqual(await adv.evaluate(() => [document.querySelectorAll('.advent-door.ready').length, document.querySelectorAll('.advent-door.locked').length, $('adventReveal').hidden]), [2, 21, false]);
    await adv.evaluate(() => saveNow());
    await adv.reload();
    await adv.waitForTimeout(900);
    assert.ok(await adv.evaluate(() => !!adventOpened()[1] && !canOpenDoor(1) && canOpenDoor(3) && !canOpenDoor(4)));
    ok('calendrier de l’Avent');

    // la phrase du moment dit ce qu'il vit, et désigne le bon bouton
    const c = await open('?heure=14', { ...STATE, tutorial: 'done' });
    await idle(c);
    await c.evaluate(() => { state.hunger = 28; renderStats(); });
    assert.deepStrictEqual([await c.textContent('#statusText'), await c.getAttribute('#statusText', 'class')], ['🍔 Il commence à avoir faim → 🍽️ Manger', 'lvl-soft']);
    await c.evaluate(() => { state.hunger = 10; state.alerts = { hunger: { since: Date.now() - 5 * 60000, counted: false } }; renderStats(); });
    assert.ok((await c.textContent('#statusText')).includes('depuis 5 min'));
    await c.click('#statusLine');
    assert.ok(await c.evaluate(() => $('btnCoffee').classList.contains('flash-hint')), 'le bon bouton clignote');
    ok('phrase du moment');

    // jauges : chiffre affiché, explication au toucher
    await c.evaluate(() => { state.alerts = {}; state.hunger = 64; renderStats(); });
    assert.strictEqual(await c.textContent('#val-hunger'), '64');
    await c.click('.stat-row[data-gauge="energy"]');
    assert.ok((await c.textContent('#hudTip')).startsWith('⚡ Énergie'));
    ok('jauges expliquées');

    // boutons impossibles grisés, avec la raison
    await c.evaluate(() => { state.sick = true; renderStats(); });
    assert.deepStrictEqual(await c.evaluate(() => [...document.querySelectorAll('.buttons .btn.off')].map((x) => x.id)), ['btnRun', 'btnCode', 'btnGame']);
    assert.strictEqual(await c.textContent('#statusText'), '🤒 Il est malade → 💊 Soigner');
    await c.evaluate(() => { state.sick = false; renderStats(); });
    assert.deepStrictEqual(await c.evaluate(() => [...document.querySelectorAll('.buttons .btn.off')].map((x) => x.id)), ['btnHeal']);
    ok('boutons grisés');

    // appui long sur un bouton : l'explication, sans lancer l'action
    await c.mouse.click(5, 5);
    const rb = await c.locator('#btnRun').boundingBox();
    await c.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2);
    await c.mouse.down(); await c.waitForTimeout(800); await c.mouse.up();
    await c.waitForTimeout(200);
    assert.ok((await c.textContent('#hudTip')).startsWith('🏃 Courir'));
    assert.deepStrictEqual(await c.evaluate(() => [state.counters.runs || 0, busy]), [0, false], 'pas de course lancée');
    ok('appui long = explication');

    // fiche de statut : les gestes utiles en un toucher
    await c.evaluate(() => { state.hunger = 25; renderStats(); });
    await c.click('#mood');
    assert.ok((await c.textContent('#statusBody')).includes('À faire maintenant'));
    await c.click('#statusBody .away-chip >> nth=0');
    await c.waitForTimeout(300);
    assert.ok(await c.isVisible('#food'), 'le geste conseillé s’ouvre');
    ok('statut avec gestes conseillés');

    // la nuit : la phrase parle de la lumière, puis du réveil
    const nt = await open('?heure=23', { ...STATE, lights: true });
    assert.ok((await nt.textContent('#statusText')).startsWith('💡'));
    await nt.click('#btnSleep');
    assert.strictEqual(await nt.textContent('#statusText'), '😴 Il dort · réveil vers 7 h 30');
    ok('phrase de la nuit');

    // carrière de pilote : garage, pneus, classement des 10 pilotes
    const pc = await open('?heure=15', { ...STATE, tutorial: 'done', tokens: 200 });
    await pc.waitForTimeout(900);          // laisse passer le bonus de série du démarrage
    await idle(pc);
    await pc.click('#raceNo');
    assert.strictEqual(await pc.locator('#careerTabs .tab').count(), 5);
    await pc.click('#careerTabs .tab[data-ctab="garage"]');
    const tk = await pc.evaluate(() => state.tokens);
    await pc.click('.part-buy[data-part="moteur"]');
    assert.deepStrictEqual(await pc.evaluate((t) => [state.car.moteur, t - state.tokens], tk), [1, 30]);
    await pc.click('#careerTabs .tab[data-ctab="course"]');
    await pc.click('.tire[data-tire="durs"]');
    assert.strictEqual(await pc.getAttribute('.tire[data-tire="durs"]', 'aria-pressed'), 'true');
    await pc.click('#gpGo');
    await pc.waitForTimeout(400);
    assert.deepStrictEqual(await pc.evaluate(() => [race.tire, !!race.gp, race.mod.speed > 0.8]), ['durs', true, true]);
    await pc.evaluate(() => { race.score = 22; race.t = 39.9; });
    await pc.waitForFunction(() => Object.keys(state.career.gp).length === 1, null, { timeout: 5000 });
    assert.strictEqual(await pc.evaluate(() => Career.standings(state).reduce((a, x) => a + x.pts, 0)), 101, 'les rivaux marquent aussi');
    await pc.waitForFunction(() => !careerModal.hidden, null, { timeout: 8000 });
    assert.ok((await pc.textContent('#careerBody')).includes('Ce qui a compté'), 'détail du résultat');
    await pc.click('#careerTabs .tab[data-ctab="classement"]');
    assert.strictEqual(await pc.locator('.standings tr').count(), 10);
    assert.strictEqual(await pc.locator('.palm').count(), 7);
    await pc.evaluate(() => saveNow());
    await pc.reload();
    await pc.waitForTimeout(900);
    assert.deepStrictEqual(await pc.evaluate(() => [state.car.moteur, Object.keys(state.career.season.rivals).length]), [1, 9], 'voiture et rivaux conservés');
    ok('carrière : garage, pneus, classement');

    // nouveau mois : fin du championnat avec place, titre et récompense
    const oldSeason = { races: 1, wins: 1, podiums: 1, circuits: { monaco: 1 }, winsAt: { monaco: 1 }, chapters: { c1: 'x', c2: 'x', c3: 'x' }, seasons: [], gp: { '2000-01-05': { circuit: 'monaco', place: 1, points: 25 } }, season: { month: '2000-01', points: 25, races: 1, wins: 1, podiums: 1 } };
    const se = await open('?heure=15', { ...STATE, tutorial: 'done', career: oldSeason });
    await se.waitForTimeout(2600);
    assert.ok(await se.isVisible('#chapterModal'), 'fenêtre de fin de championnat');
    assert.ok((await se.textContent('#chapterTitle')).includes('1ʳᵉ'));
    assert.deepStrictEqual(await se.evaluate(() => [state.career.seasons.length, state.career.seasons[0].pos, state.career.season.races, !!state.trophies.champion]), [1, 1, 0, true]);
    ok('fin de championnat');

    // ses visites : rares, jamais pendant qu'on joue, et écourtées dès qu'on touche un bouton
    {
      const d = new Date();
      const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const vctx = await browser.newContext({ viewport: { width: 400, height: 1000 } });
      await vctx.addInitScript('window.__noHelp = true;');
      await vctx.addInitScript(`if(!sessionStorage.x){sessionStorage.x=1;localStorage.setItem('cheriotchi_state', ${JSON.stringify(JSON.stringify({ ...STATE, lastVisitDay: dk, tutorial: 'done', lastVisitAt: Date.now() }))})}`);
      const v = await vctx.newPage();
      v.on('pageerror', (e) => errors.push(e.message));
      await v.goto(base + '?heure=15');
      await v.waitForTimeout(3200);
      assert.strictEqual(await v.evaluate(() => girlBusy), false, 'pas de visite d’accueil : elle vient de passer');
      assert.ok(await v.evaluate(() => nextVisitAt - Date.now() > 5 * 60000), 'prochaine visite dans plusieurs minutes');
      await v.evaluate(() => { nextVisitAt = 0; lastTouchAt = Date.now(); });
      await v.waitForTimeout(4500);
      assert.strictEqual(await v.evaluate(() => girlBusy), false, 'pas de visite pendant qu’on joue');
      await v.evaluate(() => { lastTouchAt = Date.now() - 20000; });
      await v.waitForFunction(() => girlBusy && !!visit, null, { timeout: 8000 });
      await v.click('#btnCoffee');
      await v.waitForFunction(() => !$('food').hidden, null, { timeout: 3000 });
      assert.deepStrictEqual(await v.evaluate(() => [girlBusy, busy, spriteHerEl.classList.contains('visible')]), [false, false, false]);
      await vctx.close();
      ok('ses visites : rares et écourtables');
    }

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
