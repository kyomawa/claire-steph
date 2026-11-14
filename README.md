# Chéri-o-tchi ⛽💕

Un tamagotchi perso aux couleurs Gulf.

- `html/` : le jeu (page `index.html`, images dans `html/img/`, liste des images dans `html/assets.js`)
- `server/server.js` : petit serveur Node **sans dépendance** qui sert le jeu et la **sauvegarde en ligne**
- `source/` : les planches de dessins d'origine
- `tools/build-single-file.py` : fabrique un seul fichier HTML autonome (images intégrées) pour tester

## Lancer en local

```bash
node server/server.js        # puis http://localhost:3000
```

Les sauvegardes en ligne vont dans `data/` (une petite fiche JSON par code).

## Mettre en ligne avec Dokploy (sauvegarde en ligne incluse)

1. Dans l'application Dokploy, passer le **Build Type** sur **Dockerfile** (le `Dockerfile` est à la racine).
2. Dans **Advanced → Volumes**, ajouter un volume monté sur **`/data`**
   (sinon les sauvegardes en ligne sont perdues à chaque redéploiement).
3. Dans **Domains**, le port du conteneur est **3000**.
4. Redéployer, puis vérifier `https://ton-domaine/api/health` → `{"ok":true}`.

Sans le serveur (hébergement statique du dossier `html/`), le jeu marche toujours :
la partie reste sauvegardée sur le téléphone, seule la sauvegarde en ligne est indisponible.

## Comment marche la sauvegarde

- **Sur l'appareil** : enregistrée automatiquement à chaque action (stockage du navigateur),
  avec une copie de la veille et un export/import manuel (bouton 💾).
- **En ligne** : bouton 💾 → « Activer la sauvegarde en ligne » donne un code (ex. `ABCD-EF23`).
  Sur un autre téléphone : 💾 → « J'ai un code ». La partie **jouée le plus récemment** gagne ;
  un appareil resté ouvert sans qu'on y touche n'écrase rien.
- Le code sert de clé : ne le partage qu'avec la personne qui joue.
