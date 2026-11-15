# Chéri-o-tchi — Game design

Un tamagotchi en temps réel : il vit même quand le jeu est fermé. Toutes les règles
chiffrées ci-dessous vivent dans **un seul fichier**, `html/js/engine/sim.js`, utilisé à la fois
par le jeu et par le serveur (notifications). Changer un chiffre ici = le changer partout.

## 1. Le temps

- **Une seule horloge** : la simulation avance par pas de quelques minutes, que le jeu soit ouvert
  ou fermé (rattrapage jusqu'à 72 h). Plus de différence entre « en jeu » et « hors jeu ».
- **Journée** : il se couche à **22 h 30** et se lève à **7 h 30** (heure du téléphone).

## 2. Les besoins (0 à 100)

| Besoin   | Éveillé (par heure) | Endormi (par heure) |
|----------|---------------------|---------------------|
| Faim     | −7                  | −2                  |
| Énergie  | −5                  | **+12** (+6 si la lumière reste allumée) |
| Bonheur  | −4, −2 par caca au sol | −0,5             |
| Amour    | −3                  | −1                  |

Un besoin plein se vide en une douzaine d'heures : une visite le matin, une le midi, une le soir
suffisent pour un tamagotchi heureux. Les actions (repas, jeux, câlins…) remplissent fortement.

## 3. Le cycle de vie quotidien

- **Digestion** : chaque repas programme un caca **1 h à 2 h 30 plus tard** (3 au maximum au sol).
- **Coucher** : à 22 h 30 il s'endort. Il faut **éteindre la lumière** (bouton 💡 la nuit).
  Lumière allumée plus de 30 minutes pendant son sommeil = il dort mal (récupération ÷ 2)
  et ça compte comme **un soin oublié**.
- **Réveil** à 7 h 30 : la lumière se rallume, il réclame son café.

## 4. Appels à l'attention et soins oubliés

Il « appelle » (⚠️ clignotant, son, notification si le jeu est fermé) quand :

| Appel | Condition |
|---|---|
| Faim | faim < 15 |
| Tristesse | bonheur < 15 |
| Manque | amour < 15 |
| Saleté | 2 cacas ou plus au sol |
| Maladie | malade |
| Lumière | lumière allumée pendant qu'il dort |

Un appel ignoré **45 minutes** devient **un soin oublié**. Les soins oubliés des 7 derniers jours
font baisser la **complicité** (★★★★★) : moins de visites d'elle, moins de bonus.

## 5. Maladie

Il tombe malade si la faim reste à 0 pendant 2 h, ou si 3 cacas restent au sol 1 h.
Malade : bonheur et énergie baissent plus vite, il ne guérit pas tout seul → **💊 Soigner**.
Avec peu de sagesse, il peut refuser le médicament une fois sur trois.

## 6. Poids (forme)

Départ 70 kg. Les repas et gourmandises font grossir (gâteau +0,9, frites +0,7…),
la course et le sport font maigrir (−0,5). Le poids revient doucement vers 70 kg.
Au-dessus de 80 kg il se fatigue plus vite ; sous 62 kg il est grognon.

## 7. Sagesse et caprices

Une à deux fois par jour, il fait un **caprice** (appel sans vrai besoin, « Je veux un poney ! »).
- **Céder** : bonheur +6, sagesse −8.
- **Lui expliquer** : sagesse +10, bonheur −3, un peu d'XP.
Sagesse haute (> 70) : +10 % d'XP sur les actions. Sagesse basse (< 30) : plus de caprices.

## 8. Évolution : sa personnalité

Chaque action nourrit une catégorie (sport, gourmandise, geek, romantique, fête, calme).
Les points s'effacent doucement (demi-vie ~1,5 jour). La catégorie dominante devient sa
**personnalité**, avec un petit bonus :

| Personnalité | Nourrie par | Bonus |
|---|---|---|
| 🏃 Sportif | courir, sport, ballon | +50 % de bonheur en courant |
| 🍔 Gourmand | repas, gourmandises | plat préféré : bonus doublé |
| 💻 Geek | coder, mini-jeux | +2 jetons par partie |
| 💕 Romantique | câlins, moments à deux, mots doux | câlins +30 % d'amour |
| 🪩 Fêtard | danse, soirée | danse : +1 étoile de bonus |
| 😌 Zen | équilibre (rien ne domine) | besoins −10 % de baisse |

## 9. Économie

- **XP** → niveaux → rangs de pilote → accessoires.
- **Jetons ⛽** : mini-jeux, défis du jour, envies exaucées, niveaux → boutique.
- Anti-farm : à partir de la **4ᵉ partie du même mini-jeu dans la journée**, les gains sont
  divisés par 2, puis par 4 à partir de la 7ᵉ (affiché sur la carte du jeu : « gains ×0,5 aujourd'hui »).

## 10. Motion design

- Langage commun : courbes d'accélération et durées partagées (tokens CSS dans `css/motion.css`).
- Personnage vivant : respiration à l'arrêt, « squash & stretch » sur les bisous et chatouilles,
  posture affaissée quand il va mal.
- Transitions : ouverture en iris pour les scènes, fenêtres qui « rebondissent » à l'ouverture,
  jauges qui pulsent quand elles sont critiques, confettis au passage de niveau.
- Ambiance : écran d'accueil au lancement, reflet de vitre sur l'écran, nuages qui passent
  dans les décors extérieurs (sauf la nuit et sous la pluie).
- Tout est coupé si le téléphone demande de réduire les animations, ou si « Animations réduites »
  est coché dans ⚙️.

## 11. Carrière de pilote (`html/js/engine/career.js`)

**Compétences** (0 à 100) : 🏎️ Pilotage, 💪 Endurance, 🍳 Cuisine, 💻 Code, 💘 Charme.
Chaque activité en entraîne une ou deux (courir → endurance + pilotage, coder → code,
moment « Cuisine » → cuisine, câlins et mots doux → charme, Course Gulf → pilotage…).
Chaque mini-jeu affiche la compétence qu'il entraîne (voir § 16).
Au plus **+6 par compétence et par jour**, et progresser devient plus dur près de 100.

## 12. Grand Prix du jour et championnat

- Un circuit par jour, en boucle, **chacun avec son caractère** :

| Circuit | Particularité | Pièce clé | Pluie |
|---|---|---|---|
| 🇫🇷 Le Mans | course de nuit (phares), l'endurance compte double | 🔩 Fiabilité | 25 % |
| 🇲🇨 Monaco | entre les murs, le pilotage avant tout, course un peu plus lente | ⚫ Pneus | 15 % |
| 🇧🇪 Spa-Francorchamps | météo capricieuse | 🌬️ Aileron | 50 % |
| 🇬🇧 Silverstone | rapide et souvent mouillé | 🌬️ Aileron | 40 % |
| 🇮🇹 Monza | le temple de la vitesse (course ×1,2) | 🔧 Moteur | 15 % |
| 🇯🇵 Suzuka | technique, plus d'obstacles | ⚫ Pneus | 25 % |
| 🇺🇸 Daytona | ovale à fond (course ×1,15) | 🔧 Moteur | 10 % |

- **Météo de la course** : la même toute la journée (sec ou pluie), tirée selon le circuit.
- **Pneus** à choisir avant le départ : tendres (+6 sur le sec, −10 sous la pluie, course plus rapide),
  durs (+2 / −6), pluie (−8 / +8, course un peu plus lente). Sous la pluie sans pneus pluie, la voiture glisse.
- Ouvert de 9 h à 22 h, s'il n'est pas malade et a au moins 30 d'énergie (la course en coûte 15).
- **Performance** = ses compétences pondérées par le circuit (somme des poids 0,85) + la course jouée
  (1,5 par point, max 45) + la voiture + les pneus − 10 s'il est fatigué (énergie < 40) + chance (±8).
  Après la course, l'écran « Ce qui a compté » montre chaque part.
- Contre 9 rivaux qui progressent au fil du mois ; points façon F1 (25, 18, 15, 12, 10, 8, 6, 4, 2, 1)
  pour **les 10 pilotes** ; jetons 30 / 20 / 15 / 5.
- **Championnat du mois** : classement des 10 pilotes, « rival du moment » (celui juste devant).
  Au premier passage du mois suivant : place finale, titre (1ᵉʳ Champion du monde, 2ᵉ Vice-champion,
  3ᵉ Podium du championnat, 4ᵉ–6ᵉ Pilote confirmé) et récompense (150, 100, 70, 40 puis 20 jetons).
  Les saisons commencées avant cette version retrouvent les points des rivaux en rejouant leurs courses.
- **Garage** : 4 pièces (moteur, pneus, aileron, fiabilité), niveaux 1 à 5 à 30, 60, 100, 150 et 220 jetons.
  Chaque niveau donne +0,7 partout, et +1,2 de plus sur les circuits où la pièce est la pièce clé
  (au maximum +20). Les améliorations se voient sur la voiture (aileron, bandes sur les roues, flamme,
  numéro doré).
- **Palmarès** : meilleur résultat sur chaque circuit ; trophées 🔧 premier réglage, 🏎️ voiture complète,
  ☔ victoire sous la pluie, 👑 champion du monde.

## 13. Histoire « Le rêve du Mans »

7 chapitres débloqués par la progression (premier Grand Prix, premier podium, compétences à 30,
première victoire, Monaco, victoire au Mans…), chacun avec un petit texte et des jetons.

## 14. Bilan de la semaine et série

- Le bien-être (moyenne des besoins, moins cacas, maladie et bouderie) est relevé **chaque heure**,
  y compris pendant les absences (rejouées par le moteur).
- Tous les 7 jours : note **S / A / B / C / D** (bien-être moyen + soins oubliés), graphique
  des 7 jours, récompense de 40 à 5 jetons.
- Série de jours d'affilée : 5, 5, 10, 10, 15, 15 puis **40 jetons** le 7ᵉ jour, en boucle.

## 15. Prise en main et confort

- **Premiers pas** : une bulle guide les 3 gestes de base (repas, câlin, mini-jeu) ; elle se place
  sous le bouton à toucher et disparaît dès que c'est fait. +20 jetons à la fin, « Passer » possible.
  Les joueurs qui ont déjà nourri et câliné ne la voient pas.
- **Réglages** (⚙️) : sons, vibrations, animations réduites. Conservés d'une fois sur l'autre.
- **Mini-jeux** : « ✕ Quitter » à tout moment, sans récompense ni pénalité.
- **Pendant une visite** : toucher un bouton affiche « Attends la fin de sa visite » au lieu de ne rien faire.
- **Fenêtres** : une seule apparition automatique à la fois ; retour / Échap ferme la fenêtre du dessus.
- **La phrase du moment** (sous le titre) : une seule phrase dit ce qu'il vit et ce qu'il lui faut,
  dans cet ordre de priorité : malade → il dort (lumière ?) → appel urgent (« Il a faim depuis 12 min ») →
  bouderie, caprice, question du jour → besoin conseillé → envie → bientôt l'heure du dodo →
  Grand Prix ouvert → défis du jour → astuce de jeu. Couleur : rouge urgent, orange conseillé, nuit en bleu
  marine. La toucher fait clignoter le bon bouton (ou ouvre sa fiche s'il n'y a rien à faire).
- **Jauges chiffrées** : la valeur sur 100 à droite de chaque barre (orange sous 15). Toucher une jauge :
  ce qu'elle veut dire (barre pleine = bien), sa vitesse de baisse (règles du moteur), comment la remonter
  et ce qui se passe quand elle est basse.
- **Boutons expliqués** : appui long = ce que fait le bouton, avec ses effets chiffrés (sans lancer l'action).
  **Grisé** = impossible pour l'instant (Courir, Coder, Jouer quand il est malade ou épuisé ; Soigner quand
  il va bien ; Manger quand il n'a plus faim) ; le toucher dit toujours pourquoi.
- **Fiche de statut** (sa tête en haut à droite) : « À faire maintenant » en tête, avec les gestes en un toucher.
- **Réglages** sous ⚙️ (au lieu de 💾, qui ressemblait à « sauvegarder »).
- **Pastilles sur les boutons** : orange = conseillé (faim < 35, caca à ramasser, amour ou bonheur < 35,
  énergie < 25), rouge qui pulse = il t'appelle (soin oublié si rien n'est fait en 45 min).
  Rien n'est conseillé pendant qu'il dort, sauf éteindre la lumière.
- **Pastilles du haut** (🗓️ ⭐ 🔥) : on les touche pour une explication et le prochain objectif
  (XP manquante, ce qui se débloque au niveau suivant, bonus de la série).
- **Résumé d'absence** : après 3 h ou plus, une fenêtre dit ce qui s'est passé (sommeil, cacas,
  maladie, appels sans réponse), l'évolution des 4 jauges et propose les gestes utiles en un toucher.
- **Quoi de neuf ?** : après une mise à jour, une fenêtre présente les nouveautés une seule fois.
- **Aide** rangée en 4 thèmes : le toucher, prendre soin de lui, jouer et progresser, ensemble.

## 16. Les mini-jeux

| Jeu | Principe | Compétence | Étoiles |
|---|---|---|---|
| 💋 Attrape les bisous | 20 s, glisser pour attraper bisous et cafés, éviter les bugs | 💪 Endurance | selon le score |
| 🧠 Mémoire | 6 paires | 💻 Code | ≤ 9 coups : 3 · ≤ 13 : 2 |
| 🪩 Danse avec elle | taper en rythme | 💘 Charme, 💪 Endurance | ≥ 80 % : 3 · ≥ 50 % : 2 |
| 🏎️ Course Gulf | 40 s, éviter les plots, ramasser le carburant | 🏎️ Pilotage | selon le score |
| ⬅️ Gauche ou droite | 5 manches de devinette | 💘 Charme | — |
| 🐛 Chasse aux bugs | 20 s, écraser 🐛 (+1) et 🪲 (+2), éviter 💣 (−2), ☕ = +2 s | 💻 Code | ≥ 18 pts : 3 · ≥ 11 : 2 |
| 🍳 Recette à deux | refaire l'ordre des ingrédients, un de plus à chaque plat (3 au départ) | 🍳 Cuisine, 💘 Charme | ≥ 6 plats : 3 · ≥ 3 : 2 |
| 🚦 Feux de départ | 3 départs : taper dès que les 5 feux s'éteignent, faux départ si trop tôt | 🏎️ Pilotage | < 0,33 s : 3 · < 0,45 s : 2 |

Récompenses communes : bonheur, amour, XP (4 + 3 × étoiles) et jetons (4 × étoiles), réduits par l'anti-farm.
Records et trophées : 🐞 22 pts aux bugs, 👨‍🍳 6 plats, 🚦 moins de 0,30 s.

## 17. Calendrier de l'Avent

- Du 1er au 24 décembre, un bouton 🎄 apparaît dans l'écran (pastille rouge s'il reste une case).
- Une case par jour, et les cases oubliées restent ouvrables jusqu'au 31 décembre.
- Surprises : jetons (10 à 30), XP, gourmandises et moments (chocolat chaud, plaid, boules de neige…)
  qui remontent les jauges, mots doux rangés dans le carnet ; le 24, grand cadeau de 50 jetons.
- Les 24 mots sont dans `CONFIG.adventMessages` (`html/js/00-config.js`), à personnaliser librement.
- Trophée 🎄 « Esprit de Noël » pour les 24 cases.
