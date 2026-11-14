/*
 * Chéri-o-tchi — moteur de simulation (source unique des règles du jeu).
 * Utilisé par le jeu (window.CheriSim) et par le serveur (require) pour les notifications.
 * Aucune dépendance, aucune référence au DOM : uniquement des fonctions pures sur l'état.
 * Les règles sont décrites dans docs/GAME_DESIGN.md.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CheriSim = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  const RULES = {
    bedtime: 22.5,              // 22 h 30
    wakeup: 7.5,                // 7 h 30
    awake: { hunger: -7, energy: -5, happy: -4, love: -3 },
    asleep: { hunger: -2, energy: 12, happy: -0.5, love: -1 },
    lightsOnSleepFactor: 0.5,   // récupération divisée par 2 si la lumière reste allumée
    poopHappy: -2,              // par caca au sol, par heure
    sick: { happy: -3, energy: -3, hunger: -1 },
    overweightEnergyFactor: 1.25,
    underweightHappyFactor: 1.2,
    zenFactor: 0.9,
    digestMin: 60,              // minutes avant un caca après un repas
    digestMax: 150,
    maxPoops: 3,
    sickHungerZeroHours: 2,
    sickPoopsHours: 1,
    alertGraceMin: 45,          // appel ignoré → soin oublié
    lightsGraceMin: 30,
    weightBase: 70,
    weightDriftPerHour: 0.05,
    activityHalfLifeHours: 36,
    maxCatchUpHours: 72,
    stepMin: 5
  };

  const ALERTS = {
    hunger: { label: 'Il a faim', icon: '🍔', test: (s) => s.hunger < 15 },
    happy: { label: 'Il est triste', icon: '😢', test: (s) => s.happy < 15 },
    love: { label: 'Tu lui manques', icon: '💌', test: (s) => s.love < 15 },
    dirty: { label: "C'est sale", icon: '💩', test: (s) => (s.poops || []).length >= 2 },
    sick: { label: 'Il est malade', icon: '🤒', test: (s) => !!s.sick },
    lights: { label: 'Lumière allumée', icon: '💡', test: (s, ctx) => ctx.asleep && s.lights !== false }
  };

  const PERSONALITIES = {
    sport: { name: 'Sportif', icon: '🏃' },
    food: { name: 'Gourmand', icon: '🍔' },
    geek: { name: 'Geek', icon: '💻' },
    love: { name: 'Romantique', icon: '💕' },
    party: { name: 'Fêtard', icon: '🪩' },
    zen: { name: 'Zen', icon: '😌' }
  };

  const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
  const defaultHourOf = (t) => { const d = new Date(t); return d.getHours() + d.getMinutes() / 60; };

  function isSleepHour(h) { return h >= RULES.bedtime || h < RULES.wakeup; }

  // Complète un état ancien avec les champs du moteur
  function ensure(s) {
    if (typeof s.weight !== 'number') s.weight = RULES.weightBase;
    if (typeof s.discipline !== 'number') s.discipline = 50;
    if (typeof s.lights !== 'boolean') s.lights = true;
    if (!Array.isArray(s.poops)) s.poops = [];
    if (!Array.isArray(s.digestQueue)) s.digestQueue = [];
    if (!s.alerts || typeof s.alerts !== 'object') s.alerts = {};
    if (!Array.isArray(s.mistakes)) s.mistakes = [];
    if (!s.activity || typeof s.activity !== 'object') s.activity = { sport: 0, food: 0, geek: 0, love: 0, party: 0 };
    if (typeof s.hungerZeroSince !== 'number') s.hungerZeroSince = 0;
    if (typeof s.poopsFullSince !== 'number') s.poopsFullSince = 0;
    if (typeof s.awakeUntil !== 'number') s.awakeUntil = 0;
    return s;
  }

  function isAsleep(s, t, hourOf) {
    return isSleepHour((hourOf || defaultHourOf)(t)) && t > (s.awakeUntil || 0);
  }

  function personality(s) {
    const a = (s && s.activity) || {};
    const keys = ['sport', 'food', 'geek', 'love', 'party'];
    const sorted = keys.map((k) => [k, a[k] || 0]).sort((x, y) => y[1] - x[1]);
    const total = sorted.reduce((sum, x) => sum + x[1], 0);
    if (total < 20) return null;                           // encore en train de se découvrir
    if (sorted[0][1] < 12 || sorted[0][1] < sorted[1][1] * 1.3) return 'zen';
    return sorted[0][0];
  }

  function bond(s, now) {
    const recent = (s.mistakes || []).filter((m) => now - m.t < 7 * DAY).length;
    return Math.max(0, 5 - Math.floor(recent / 2));
  }

  // Avance la simulation de `from` à `to`. Modifie `s` et renvoie la liste des événements.
  function simulate(s, from, to, opts) {
    ensure(s);
    const hourOf = (opts && opts.hourOf) || defaultHourOf;
    const rnd = (opts && opts.random) || Math.random;
    const events = [];
    if (!from || to <= from) return events;
    from = Math.max(from, to - RULES.maxCatchUpHours * HOUR);
    const pers = personality(s);
    let t = from;
    let wasAsleep = isAsleep(s, t, hourOf);
    while (t < to) {
      const dtMs = Math.min(RULES.stepMin * MIN, to - t);
      const dt = dtMs / HOUR;
      t += dtMs;
      const h = hourOf(t);
      const asleep = isAsleep(s, t, hourOf);

      // changement jour / nuit
      if (asleep !== wasAsleep) {
        if (asleep) events.push({ type: 'sleep', t });
        else {
          s.lights = true;
          events.push({ type: 'wake', t });
        }
        wasAsleep = asleep;
      }

      // besoins
      const r = asleep ? RULES.asleep : RULES.awake;
      let energyGain = r.energy;
      if (asleep && s.lights) energyGain *= RULES.lightsOnSleepFactor;
      let k = pers === 'zen' ? RULES.zenFactor : 1;
      let dh = r.hunger * k, de = (energyGain < 0 ? energyGain * k : energyGain), dha = r.happy * k, dl = r.love * k;
      if (!asleep) dha += RULES.poopHappy * s.poops.length;
      if (s.sick) { dha += RULES.sick.happy; de += RULES.sick.energy; dh += RULES.sick.hunger; }
      if (s.weight > 80 && de < 0) de *= RULES.overweightEnergyFactor;
      if (s.weight < 62 && dha < 0) dha *= RULES.underweightHappyFactor;
      s.hunger = clamp(s.hunger + dh * dt);
      s.energy = clamp(s.energy + de * dt);
      s.happy = clamp(s.happy + dha * dt);
      s.love = clamp(s.love + dl * dt);

      // poids qui revient doucement vers la normale
      const wd = RULES.weightBase - s.weight;
      s.weight += Math.sign(wd) * Math.min(Math.abs(wd), RULES.weightDriftPerHour * dt);

      // personnalité : les points s'effacent doucement
      const decay = Math.pow(0.5, dt / RULES.activityHalfLifeHours);
      for (const key of Object.keys(s.activity)) s.activity[key] *= decay;

      // digestion → cacas
      if (s.digestQueue.length && s.digestQueue[0] <= t) {
        s.digestQueue.shift();
        if (s.poops.length < RULES.maxPoops) {
          s.poops.push(Math.round(8 + rnd() * 74));
          events.push({ type: 'poop', t });
        }
      }

      // maladie
      if (s.hunger <= 0) { if (!s.hungerZeroSince) s.hungerZeroSince = t; } else s.hungerZeroSince = 0;
      if (s.poops.length >= RULES.maxPoops) { if (!s.poopsFullSince) s.poopsFullSince = t; } else s.poopsFullSince = 0;
      if (!s.sick) {
        const starving = s.hungerZeroSince && t - s.hungerZeroSince >= RULES.sickHungerZeroHours * HOUR;
        const filthy = s.poopsFullSince && t - s.poopsFullSince >= RULES.sickPoopsHours * HOUR;
        if (starving || filthy) {
          s.sick = true;
          s.sulk = false;
          events.push({ type: 'sick', t, why: starving ? 'hunger' : 'dirty' });
        }
      }

      // appels à l'attention → soins oubliés
      const ctx = { asleep, hour: h };
      for (const [key, def] of Object.entries(ALERTS)) {
        const on = def.test(s, ctx);
        const a = s.alerts[key];
        if (on && !a) {
          s.alerts[key] = { since: t, counted: false };
          events.push({ type: 'alert', key, t });
        } else if (!on && a) {
          delete s.alerts[key];
          events.push({ type: 'alertEnd', key, t });
        } else if (on && a && !a.counted) {
          const grace = (key === 'lights' ? RULES.lightsGraceMin : RULES.alertGraceMin) * MIN;
          if (t - a.since >= grace) {
            a.counted = true;
            s.mistakes.push({ t, k: key });
            events.push({ type: 'mistake', key, t });
          }
        }
      }
    }
    s.mistakes = s.mistakes.filter((m) => to - m.t < 7 * DAY);
    return events;
  }

  // Un repas : prise de poids + caca programmé
  function eat(s, now, weightGain, rnd) {
    ensure(s);
    s.weight = clamp(s.weight + (weightGain || 0), 45, 110);
    const r = rnd || Math.random;
    const due = now + (RULES.digestMin + r() * (RULES.digestMax - RULES.digestMin)) * MIN;
    if (s.digestQueue.length < 4) s.digestQueue.push(due);
    s.digestQueue.sort((a, b) => a - b);
  }

  function addActivity(s, cat, pts) {
    ensure(s);
    if (cat in s.activity) s.activity[cat] += pts;
  }

  // Multiplicateur anti-farm des mini-jeux (n = numéro de la partie du jour)
  function playMultiplier(n) { return n <= 3 ? 1 : (n <= 6 ? 0.5 : 0.25); }

  function activeAlerts(s) { return Object.keys((s && s.alerts) || {}); }

  // Retire tout de suite les appels réglés par une action (sans attendre le pas suivant)
  function clearResolved(s, asleep) {
    for (const k of Object.keys(s.alerts || {})) if (!ALERTS[k] || !ALERTS[k].test(s, { asleep })) delete s.alerts[k];
  }

  return { RULES, ALERTS, PERSONALITIES, MIN, HOUR, DAY, clamp, isSleepHour, isAsleep, ensure, simulate, eat, addActivity, personality, bond, playMultiplier, activeAlerts, clearResolved };
}));
