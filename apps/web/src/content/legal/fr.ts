import type { LegalDoc } from "./types";

export const privacy: LegalDoc = {
  updated: "2026-11-18",
  sections: [
    {
      id: "summary",
      title: "Résumé",
      body: [
        "ft_transcendence est un projet amateur : un jeu de Pong en ligne avec comptes, amis, chat et tournois. Nous ne collectons que ce dont le jeu a besoin pour fonctionner, nous ne le vendons jamais, et vous pouvez supprimer votre compte à tout moment.",
      ],
    },
    {
      id: "what-we-collect",
      title: "Ce que nous collectons",
      body: ["Lorsque vous utilisez l'application, nous enregistrons :"],
      list: [
        "Les informations du compte : votre nom d'utilisateur, votre adresse e-mail et un hash salé de votre mot de passe (jamais le mot de passe lui-même).",
        "Si vous vous connectez avec Google : l'identifiant de votre compte Google, votre nom, votre e-mail et votre photo de profil, tels que partagés par Google.",
        "Votre avatar, si vous en téléversez un (PNG, JPEG ou WebP, jusqu'à 2 MB).",
        "Les données de jeu : les matchs que vous jouez (adversaire, scores, date, durée), les tournois, les victoires et les défaites.",
        "Les données sociales : demandes d'ami, amis et joueurs que vous bloquez.",
        "Les données de session : pour chaque appareil connecté, l'adresse IP et le nom du navigateur, afin que vous puissiez voir et révoquer vos sessions.",
        "Les données d'authentification à deux facteurs, si vous l'activez : un secret d'authentification chiffré et des codes de secours hachés.",
        "Les clés d'API que vous créez : uniquement un hash de chaque clé et ses premiers caractères.",
      ],
    },
    {
      id: "why",
      title: "Pourquoi nous les utilisons",
      list: [
        "Pour vous permettre de vous connecter et de sécuriser votre compte.",
        "Pour vous associer à des adversaires, organiser les matchs et les tournois, et afficher vos statistiques et votre historique.",
        "Pour afficher votre profil, votre présence (en ligne, en jeu, hors ligne) et vos amis aux autres joueurs.",
        "Pour prévenir les abus, comme les tentatives de connexion par force brute.",
      ],
    },
    {
      id: "visible",
      title: "Ce que les autres joueurs peuvent voir",
      body: [
        "Les autres joueurs connectés peuvent voir votre nom d'utilisateur, votre avatar, votre présence, vos statistiques et votre historique de matchs. Votre adresse e-mail, vos sessions, vos clés d'API et les joueurs que vous bloquez ne sont jamais montrés à quiconque.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies et stockage local",
      list: [
        "Un cookie de session (ft.session_token), nécessaire pour vous garder connecté. Il est httpOnly : les scripts de la page ne peuvent pas le lire.",
        "Un cookie de langue (ft_lang) qui mémorise l'anglais, l'espagnol ou le français.",
        "Le stockage local de votre navigateur pour les préférences d'affichage : effets CRT, animations réduites et son.",
      ],
      body: ["Nous n'utilisons pas de cookies publicitaires ni de cookies d'analyse tiers."],
    },
    {
      id: "retention",
      title: "Combien de temps nous les conservons",
      body: [
        "Vos données sont conservées tant que votre compte existe. Les sessions expirent après 7 jours sans utilisation. La suppression de votre compte efface immédiatement votre profil, votre e-mail, vos amis, blocages, messages, sessions, méthodes de connexion, double authentification, clés d'API et avatar ; les matchs terminés restent dans l'historique de vos adversaires sous « Joueur supprimé ».",
      ],
    },
    {
      id: "rights",
      title: "Vos droits",
      body: [
        "Vous pouvez consulter et modifier votre profil dans les Paramètres, révoquer vos sessions et vos clés d'API, et, dans Paramètres → Vos données, télécharger une copie de tout ce que nous conservons sur vous ou supprimer vous-même votre compte. Pour toute autre demande, écrivez-nous : nous répondons sous 30 jours.",
      ],
    },
    {
      id: "security",
      title: "Sécurité",
      body: [
        "Tout le trafic utilise HTTPS. Les mots de passe sont hachés, les sessions peuvent être révoquées à tout moment et l'authentification à deux facteurs est disponible. Aucun système n'est parfaitement sûr : utilisez donc un mot de passe unique.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      body: ["Pour toute question ou demande relative à la confidentialité, contactez le responsable du projet via le dépôt GitHub du projet."],
    },
  ],
};

export const terms: LegalDoc = {
  updated: "2026-11-18",
  sections: [
    {
      id: "agreement",
      title: "Accord",
      body: [
        "En créant un compte ou en jouant, vous acceptez ces conditions. Si vous n'êtes pas d'accord, n'utilisez pas le service. ft_transcendence est un projet gratuit et non commercial, fourni tel quel.",
      ],
    },
    {
      id: "account",
      title: "Votre compte",
      list: [
        "Vous devez avoir au moins 13 ans.",
        "Gardez votre mot de passe et vos clés d'API secrets ; vous êtes responsable de l'activité de votre compte.",
        "Une personne, un compte. Les noms d'utilisateur qui usurpent l'identité d'autrui ou qui sont offensants peuvent être modifiés ou supprimés.",
      ],
    },
    {
      id: "fair-play",
      title: "Fair-play",
      list: [
        "Ne trichez pas, n'automatisez pas le jeu et n'exploitez pas de bugs pour gagner.",
        "Ne harcelez pas, ne menacez pas et ne spammez pas les autres joueurs. Utilisez Bloquer si quelqu'un vous dérange.",
        "N'essayez pas de casser ou de surcharger le service, ni d'y accéder sans autorisation.",
      ],
    },
    {
      id: "content",
      title: "Contenu que vous téléversez",
      body: [
        "Vous conservez vos droits sur votre avatar et vos messages. Vous nous autorisez à les stocker et à les afficher pour faire fonctionner le service. Ne téléversez rien d'illégal ni rien que vous n'avez pas le droit de partager.",
      ],
    },
    {
      id: "api",
      title: "API publique",
      body: [
        "Les clés d'API donnent un accès en lecture aux données publiques du jeu. Respectez les limites de débit ; les clés utilisées de manière abusive peuvent être révoquées.",
      ],
    },
    {
      id: "termination",
      title: "Suspension et suppression",
      body: [
        "Nous pouvons suspendre les comptes qui enfreignent ces conditions. Vous pouvez cesser d'utiliser le service et demander la suppression de votre compte à tout moment.",
      ],
    },
    {
      id: "liability",
      title: "Aucune garantie",
      body: [
        "Le service peut changer, être indisponible ou perdre des données sans préavis. Dans la mesure permise par la loi, nous ne sommes pas responsables des pertes découlant de son utilisation.",
      ],
    },
    {
      id: "changes",
      title: "Modifications",
      body: ["Nous pouvons mettre à jour ces conditions. La date ci-dessus indique la dernière version ; continuer à utiliser le service signifie que vous l'acceptez."],
    },
  ],
};
