// =====================================================================
//  RÉGLAGES PERSO — à modifier librement
// =====================================================================
const CONFIG = {
  // Adresse du serveur de sauvegarde en ligne. Vide = la même adresse que le jeu.
  // (Pour le fichier HTML autonome, mets l'adresse du jeu, ex. 'https://cheriotchi.mondomaine.fr')
  apiBase: '',

  // Date de début de votre histoire ('AAAA-MM-JJ'). Si null, le compteur
  // de jours démarre à la première ouverture du jeu.
  coupleStart: null,

  // Dates spéciales ('MM-JJ'). Le message s'affiche à sa visite ce jour-là
  // et rejoint le carnet de souvenirs.
  specialDates: {
    // Son anniversaire, à ajouter : 'MM-JJ': { msg: "Joyeux anniversaire …", fx: ['icoCake', 'icoGift', '🎉'], scene: 'anniversaire' },
    // '05-20': { msg: "Joyeux anniversaire à nous deux 💑", fx: ['💑', 'icoLove', '💍'] },
    '02-14': { msg: "Joyeuse Saint-Valentin mon amour 💘", fx: ['icoLove', '🌹', 'icoHeart'], scene: 'amour' },
    '12-25': { msg: "Joyeux Noël mon cœur 🎄", fx: ['🎄', 'icoGift', '⭐'], scene: 'hiver' },
    '01-01': { msg: "Bonne année à nous deux 🥂", fx: ['🥂', '🎆', '✨'], scene: 'fete' }
  },

  // Un « mot du jour » différent chaque jour, ajouté au carnet.
  dailyNotes: [
    "Tu es mon endroit préféré 🏡",
    "Je souris rien qu'en pensant à toi 😊",
    "Merci d'être toi 💛",
    "Toi + moi = la meilleure équipe ⛽",
    "J'ai hâte de te voir ce soir 🌙",
    "Ton rire, c'est ma chanson préférée 🎶",
    "Je suis fière de toi, tu sais 💪",
    "Même tes bugs, je les aime 🐛💕",
    "Un café, un câlin, et la journée est parfaite ☕",
    "Tu m'as manqué depuis ce matin 💌",
    "On repart en vacances quand ? ✈️",
    "Tu as les plus beaux yeux derrière ces lunettes 🤓",
    "Mon cœur fait vroum vroum pour toi 🏎️",
    "Je t'aime un peu, beaucoup, passionnément 🌼",
    "Tu es mon commit préféré 💻💕",
    "Pense à boire de l'eau, je veille sur toi 💧",
    "Courage pour aujourd'hui, je crois en toi ✨",
    "Je garde le meilleur bisou pour ce soir 💋",
    "Tu rends tout plus doux 🍯",
    "Avec toi, même les lundis sont jolis 🌈",
    "Mon chéri-o-tchi préféré, c'est toi 🥰",
    "Un jour de plus à t'aimer 📅💕",
    "Tu es ma personne 💑",
    "Tu me fais rire comme personne 😂",
    "Je t'envoie un câlin téléporté 🫂",
    "Tu es la plus belle surprise de ma vie 🎁",
    "Un petit run ensemble ce week-end ? 🏃‍♀️🏃",
    "Reste comme tu es, tu es parfait 💯",
    "Je t'aime plus que les frites 🍟 (et c'est beaucoup)",
    "Dodo tôt ce soir, promis ? 😴",
    "Tu es mon soleil, même la nuit ☀️🌙"
  ]
};
