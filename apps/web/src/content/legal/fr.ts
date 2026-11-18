import type { LegalDoc } from "./types";

export const privacy: LegalDoc = {
  updated: "2026-11-18",
  sections: [
    {
      id: "summary",
      title: "Résumé",
      body: [
        "VOLLEY.EXE est un projet amateur : un jeu de Pong en ligne avec comptes, amis, chat et tournois. Nous ne collectons que ce dont le jeu a besoin pour fonctionner, nous ne le vendons jamais, et vous pouvez supprimer votre compte à tout moment.",
      ],
    },
    {
      id: "what-we-collect",
      title: "Ce que nous collectons",
      body: ["Lorsque vous utilisez l'application, nous enregistrons :"],
      list: [
        "Les informations du compte : votre nom d'utilisateur, votre adresse e-mail et un hash salé de votre mot de passe (jamais le mot de passe lui-même).",
        "Votre avatar, si vous en téléversez un (PNG, JPEG ou WebP, jusqu'à 2 MB).",
        "Les données de jeu : les matchs que vous jouez (adversaire, scores, date, durée), les tournois, les victoires et les défaites.",
        "Les données sociales : demandes d'ami, amis et joueurs que vous bloquez.",
        "Les données de session : pour chaque appareil connecté, l'adresse IP et le nom du navigateur, afin que vous puissiez voir et révoquer vos sessions.",
        "Les données d'authentification à deux facteurs, si vous l'activez : un secret d'authentification chiffré et des codes de secours hachés.",
        "Les clés d'accès, si vous en ajoutez une : la clé publique et un nom (la clé privée ne quitte jamais votre appareil).",
        "Les appareils de connexion : une étiquette comme « Firefox sur Windows » pour chaque navigateur utilisé pour vous connecter, afin de vous prévenir par e-mail quand un nouveau est utilisé.",
        "Votre look : les éléments de l'avatar en pixels, le cadre et le style de raquette choisis.",
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
        "Les autres joueurs connectés peuvent voir votre nom d'utilisateur, votre avatar, votre présence, vos statistiques et votre historique de matchs. Votre adresse e-mail, vos sessions et les joueurs que vous bloquez ne sont jamais montrés à quiconque.",
      ],
    },
    {
      id: "security",
      title: "Sécurité du compte",
      body: [
        "Quand vous choisissez un mot de passe, nous le vérifions contre les fuites de données connues via le service à k-anonymat de Have I Been Pwned : seuls les 5 premiers caractères de l'empreinte SHA-1 du mot de passe quittent notre serveur, jamais le mot de passe. Sauf si ce serveur fonctionne sans e-mail, la connexion attend la confirmation de votre adresse. Nous vous écrivons quand quelqu'un se connecte à votre compte depuis un navigateur inconnu et quand quelqu'un essaie de s'inscrire avec votre adresse. Si l'exploitant l'active, l'inscription, la connexion et la réinitialisation du mot de passe utilisent Cloudflare Turnstile, une vérification anti-robot exécutée dans votre navigateur et traitée par Cloudflare.",
      ],
    },
    {
      id: "ai",
      title: "Coach et filtre du chat",
      body: [
        "Le Coach utilise un modèle d'IA qui fonctionne sur notre propre serveur : vos questions et ses réponses restent sur ce service et ne sont pas conservées. (Si l'exploitant passe un jour le Coach à un fournisseur d'IA externe, vos questions lui seront envoyées pour générer la réponse, et cette page l'indiquera.) Les messages du chat passent par un filtre automatique de mots sur notre serveur : les gros mots et les insultes discriminatoires sont masqués (par exemple « m**** ») avant l'enregistrement du message. Vous ne pouvez envoyer des liens qu'à vos amis. Les insultes discriminatoires et l'envoi répété du même message comptent comme des avertissements ; trois avertissements en 24 heures suspendent votre chat pendant une heure. Aucun contenu du chat n'est envoyé à des tiers.",
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
        "Vos données sont conservées tant que votre compte existe. Les sessions expirent après 7 jours sans utilisation. La suppression de votre compte efface immédiatement votre profil, votre e-mail, vos amis, blocages, messages, sessions, méthodes de connexion, double authentification et avatar ; les matchs terminés restent dans l'historique de vos adversaires sous « Joueur supprimé ».",
      ],
    },
    {
      id: "rights",
      title: "Vos droits",
      body: [
        "Vous pouvez consulter et modifier votre profil dans les Paramètres, révoquer vos sessions et, dans Paramètres → Vos données, télécharger une copie de tout ce que nous conservons sur vous ou supprimer vous-même votre compte. Pour toute autre demande, écrivez-nous : nous répondons sous 30 jours. Nous vous écrivons uniquement pour confirmer votre adresse, réinitialiser votre mot de passe et confirmer un téléchargement de données ou la suppression du compte.",
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
        "En créant un compte ou en jouant, vous acceptez ces conditions. Si vous n'êtes pas d'accord, n'utilisez pas le service. VOLLEY.EXE est un projet gratuit et non commercial, fourni tel quel.",
      ],
    },
    {
      id: "account",
      title: "Votre compte",
      list: [
        "Vous devez avoir au moins 13 ans.",
        "Gardez votre mot de passe secret ; vous êtes responsable de l'activité de votre compte.",
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
