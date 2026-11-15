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
  divisés par 2, puis par 4 à partir de la 7ᵉ.

## 10. Motion design

- Langage commun : courbes d'accélération et durées partagées (tokens CSS dans `css/motion.css`).
- Personnage vivant : respiration à l'arrêt, « squash & stretch » sur les bisous et chatouilles,
  posture affaissée quand il va mal.
- Transitions : ouverture en iris pour les scènes, fenêtres qui « rebondissent » à l'ouverture,
  jauges qui pulsent quand elles sont critiques, confettis au passage de niveau.
- Ambiance : écran d'accueil au lancement, reflet de vitre sur l'écran, nuages qui passent
  dans les décors extérieurs (sauf la nuit et sous la pluie).
- Tout est coupé si le téléphone demande de réduire les animations, ou si « Animations réduites »
  est coché dans 💾.

## 11. Carrière de pilote (`html/js/engine/career.js`)

**Compétences** (0 à 100) : 🏎️ Pilotage, 💪 Endurance, 🍳 Cuisine, 💻 Code, 💘 Charme.
Chaque activité en entraîne une ou deux (courir → endurance + pilotage, coder → code,
moment « Cuisine » → cuisine, câlins et mots doux → charme, Course Gulf → pilotage…).
Au plus **+6 par compétence et par jour**, et progresser devient plus dur près de 100.

## 12. Grand Prix du jour et championnat

- Un circuit par jour, en boucle : Le Mans, Monaco, Spa, Silverstone, Monza, Suzuka, Daytona.
- Ouvert de 9 h à 22 h, s'il n'est pas malade et a au moins 30 d'énergie (la course en coûte 15).
- On joue la Course Gulf ; le classement mélange **ses compétences** (pilotage 45 %, endurance 25 %,
  charme 10 %), **le score de la course** et un peu de hasard, contre 9 rivaux qui progressent
  au fil du mois.
- Points façon F1 (25, 18, 15, 12, 10, 8, 6, 4, 2, 1) ; jetons 30 / 20 / 15 / 5.
- **Championnat mensuel** : au changement de mois, la saison est archivée avec un titre
  (Champion du monde dès 300 points, Vice-champion 180, Pilote confirmé 90).

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
- **Réglages** (💾) : sons, vibrations, animations réduites. Conservés d'une fois sur l'autre.
- **Mini-jeux** : « ✕ Quitter » à tout moment, sans récompense ni pénalité.
- **Pendant une visite** : toucher un bouton affiche « Attends la fin de sa visite » au lieu de ne rien faire.
- **Fenêtres** : une seule apparition automatique à la fois ; retour / Échap ferme la fenêtre du dessus.
