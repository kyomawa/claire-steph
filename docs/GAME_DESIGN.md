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
- Tout est coupé si le téléphone demande de réduire les animations.
