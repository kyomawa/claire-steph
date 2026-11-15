# Chéri-o-tchi ⛽💕

Un tamagotchi perso aux couleurs Gulf.

- `html/` : le jeu
  - `index.html` : la page (structure seulement)
  - `css/game.css` : le thème Gulf · `css/motion.css` : le langage d'animation
  - `js/engine/sim.js` : **le moteur** (règles du jeu, sans affichage), partagé avec le serveur
  - `js/NN-*.js` : un fichier par système, chargés dans l'ordre (état, cycle de vie, actions,
    visites, garde-robe, mini-jeux, sauvegarde, notifications…)
  - `assets.js` + `img/` : les images
- `server/` : petit serveur Node **sans dépendance** (jeu + sauvegarde en ligne + notifications)
- `docs/GAME_DESIGN.md` : **les règles du jeu** (besoins, sommeil, appels, maladie, poids,
  sagesse, personnalité, économie, motion design)
- `tests/` : `sim.test.js` (moteur), `career.test.js` (carrière), `e2e.test.js` (navigateur réel)
  et `monkey.test.js` (des centaines de tapes au hasard pour traquer les blocages)
- `source/` : les planches de dessins d'origine
- `tools/build-single-file.py` : assemble un HTML autonome (ou un artefact avec `--artifact`)
- `tools/check.js` : contrôles automatiques du code (voir « Fiabilité »)

## Lancer en local

```bash
npm start                    # puis http://localhost:3000
npm test                     # contrôles + tests du moteur + tests navigateur (Playwright)
npm run lint                 # contrôles seuls (rapide)
npm run test:monkey          # test « singe » : 30 s de tapes au hasard
npm run build:single         # cheriotchi-autonome.html, à ouvrir sans serveur
```

Pour changer l'équilibrage (vitesse de la faim, horaires de dodo…), tout est dans
`RULES` en haut de `html/js/engine/sim.js` : le jeu **et** les notifications suivent.
Les textes perso (mots du jour, dates spéciales, mots du calendrier de l'Avent) sont dans
`html/js/00-config.js`.

Les sauvegardes en ligne vont dans `data/` (une petite fiche JSON par code).

## Mettre en ligne avec Dokploy (sauvegarde en ligne incluse)

1. Dans l'application Dokploy, passer le **Build Type** sur **Dockerfile** (le `Dockerfile` est à la racine).
2. Dans **Advanced → Volumes**, ajouter un volume monté sur **`/data`**
   (sinon les sauvegardes en ligne sont perdues à chaque redéploiement).
3. Dans **Domains**, le port du conteneur est **3000**.
4. (Facultatif) Dans **Environment**, mettre `PUSH_SUBJECT=mailto:ton-adresse@exemple.fr`
   (adresse de contact transmise aux services de notification de Google / Apple / Mozilla).
5. Redéployer, puis vérifier `https://ton-domaine/api/health` → `{"ok":true}`.

Le site doit être en **HTTPS** (Dokploy s'en charge avec son certificat) pour l'appli installable
et les notifications.

Sans le serveur (hébergement statique du dossier `html/`), le jeu marche toujours :
la partie reste sauvegardée sur le téléphone, seule la sauvegarde en ligne est indisponible.

## Comment marche la sauvegarde

- **Sur l'appareil** : enregistrée automatiquement à chaque action (stockage du navigateur),
  avec une copie de la veille et un export/import manuel (bouton 💾).
- **En ligne** : bouton 💾 → « Activer la sauvegarde en ligne » donne un code (ex. `ABCD-EF23`).
  Sur un autre téléphone : 💾 → « J'ai un code ». La partie **jouée le plus récemment** gagne ;
  un appareil resté ouvert sans qu'on y touche n'écrase rien.
- Le code sert de clé : ne le partage qu'avec la personne qui joue.

## Mots doux

Avec la même partie sur deux téléphones (même code de sauvegarde en ligne) :
**À deux → 💌 Lui écrire un mot doux**. Le message arrive sur l'autre téléphone
(notification si elles sont activées) et elle le lui apporte à sa prochaine visite dans le jeu.
Les messages sont gardés dans `/data/notes/`.

## Notifications

- 💾 → « 🔔 Activer » (active aussi la sauvegarde en ligne si besoin).
- **iPhone** : il faut d'abord **ajouter le jeu à l'écran d'accueil** (Partager → « Sur l'écran d'accueil »)
  et l'ouvrir depuis l'icône (iOS 16.4 ou plus récent). Sur Android, ça marche directement dans Chrome.
- Le serveur vérifie toutes les 10 minutes et prévient quand il a faim, est malade ou attend un câlin,
  plus un petit coucou le matin s'il n'a pas encore ouvert le jeu. Jamais entre 22 h et 8 h,
  ni pendant qu'il joue.
- Les clés de notification (`vapid.json`) sont créées toutes seules dans `/data` : garde le volume,
  sinon il faudra réactiver les notifications.

## Fiabilité (pour éviter les bugs)

Avant chaque mise en ligne, `npm test` doit être tout vert.

- **Contrôles du code** (`tools/check.js`) : erreurs de syntaxe, deux fonctions du même nom,
  élément de la page introuvable, image ou fichier manquant, identifiant en double.
- **Tests** : règles du moteur, carrière, et 26 parcours dans un vrai navigateur (repas, alertes,
  Grand Prix, nuit, absence, sauvegarde abîmée, rechargement, réglages, les 8 mini-jeux,
  pastilles, calendrier de l'Avent…).
- **Test singe** : des centaines de tapes au hasard (jour, nuit, malade, boudeur, partie neuve) ;
  il échoue si une erreur apparaît, si une jauge devient « NaN » ou si le jeu reste bloqué.

Dans le jeu lui-même :

- **Filet de sécurité** : une erreur imprévue est notée mais ne fige plus le jeu
  (la boucle de vie et la garde-robe continuent).
- **Chien de garde** : une action bloquée depuis 25 s se débloque toute seule, un mini-jeu
  oublié est fermé au bout de 6 min. Bouton « ✕ Quitter » pendant les mini-jeux.
- **Mini-jeux séparés** : chaque partie a un numéro ; la fin d'une ancienne partie (quittée)
  ne peut jamais couper la suivante.
- **Sauvegarde protégée** : valeurs remises d'aplomb au chargement et à chaque écriture,
  écritures regroupées (≤ 1 par seconde), et si le téléphone est plein, les vieilles photos
  sont retirées pour garder la partie.
- **Fenêtres** : celles qui s'ouvrent toutes seules (chapitre, bilan…) attendent leur tour ;
  Échap ou le bouton retour d'Android ferme seulement celle du dessus.
- **Journal technique** : 💾 → « Journal technique » affiche les derniers soucis (date + message),
  pratique pour me les envoyer.
