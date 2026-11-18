import type { LegalDoc } from "./types";

export const privacy: LegalDoc = {
  updated: "2026-11-18",
  sections: [
    {
      id: "summary",
      title: "Summary",
      body: [
        "VOLLEY.EXE is a hobby project: an online Pong game with accounts, friends, chat and tournaments. We collect only what the game needs to work, we never sell it, and you can delete your account at any time.",
      ],
    },
    {
      id: "what-we-collect",
      title: "What we collect",
      body: ["When you use the app we store:"],
      list: [
        "Account details: your username, email address and a salted hash of your password (never the password itself).",
        "Your avatar, if you upload one (PNG, JPEG or WebP, up to 2 MB).",
        "Game data: matches you play (opponent, scores, date, duration), tournaments, wins and losses.",
        "Social data: friend requests, friends and the players you block.",
        "Session data: for each signed-in device, the IP address and browser name, so you can see and revoke your sessions.",
        "Two-factor data, if you turn it on: an encrypted authenticator secret and hashed backup codes.",
      ],
    },
    {
      id: "why",
      title: "Why we use it",
      list: [
        "To let you sign in and keep your account secure.",
        "To match you with opponents, run games and tournaments, and show your stats and history.",
        "To show your profile, presence (online, in game, offline) and friends to other players.",
        "To prevent abuse, such as brute-force sign-in attempts.",
      ],
    },
    {
      id: "visible",
      title: "What other players can see",
      body: [
        "Other signed-in players can see your username, avatar, presence, stats and match history. Your email address, sessions and blocked players are never shown to anyone else.",
      ],
    },
    {
      id: "security",
      title: "Account security",
      body: [
        "When you choose a password, we check it against known data breaches using Have I Been Pwned's k-anonymity service: only the first 5 characters of the password's SHA-1 hash leave our server, never the password. Unless this server runs without email, sign-in waits until your email address is confirmed. We email you when someone signs in to your account from a browser it hasn't used before, and when someone tries to register with your address. If the operator turns it on, sign-up, sign-in and password reset include Cloudflare Turnstile, a bot check that runs in your browser and is processed by Cloudflare.",
      ],
    },
    {
      id: "ai",
      title: "Coach and chat filter",
      body: [
        "The Coach uses an AI model that runs on our own server: your questions and its answers stay on this service and are not stored. (If the operator ever switches the Coach to an external AI provider, your questions are sent to that provider to generate the reply, and this page will say so.) Chat messages are checked by an automatic word filter on our server: swear words and slurs are masked (for example \"f***\") before the message is stored. Links can only be sent to friends. Slurs and sending the same message over and over count as warnings; three warnings within 24 hours pause your chat for an hour. No chat content is sent to any third party.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies and local storage",
      list: [
        "A session cookie (ft.session_token), required to keep you signed in. It is httpOnly, so scripts on the page can't read it.",
        "A language cookie (ft_lang) that remembers English, Spanish or French.",
        "Local storage in your browser for display preferences: CRT effects, reduced motion and sound.",
      ],
      body: ["We don't use advertising or third-party analytics cookies."],
    },
    {
      id: "retention",
      title: "How long we keep it",
      body: [
        "Your data stays while your account exists. Sessions expire after 7 days without use. Deleting your account removes your profile, email, friends, blocks, messages, sessions, sign-in methods, two-factor setup and avatar immediately; finished matches remain in your opponents' history as \"Deleted player\".",
      ],
    },
    {
      id: "rights",
      title: "Your rights",
      body: [
        "You can view and change your profile in Settings, revoke sessions, and, under Settings → Your data, download a copy of everything we store about you or delete your account yourself. Anything else: ask us, and we answer within 30 days. We email you only to confirm your address, reset your password, and confirm a data download or an account deletion.",
      ],
    },
    {
      id: "security",
      title: "Security",
      body: [
        "All traffic uses HTTPS. Passwords are hashed, sessions can be revoked at any time, and two-factor authentication is available. No system is perfectly secure, so please use a unique password.",
        "Passkeys, if you add one: the public key and a name (the private key never leaves your device).",
        "Sign-in devices: a label such as \"Firefox on Windows\" for each browser you've signed in from, so we can email you when a new one is used.",
        "Your avatar look: the pixel-avatar parts, frame and paddle skin you picked.",
      ],
    },
    {
      id: "contact",
      title: "Contact",
      body: ["For any privacy question or request, contact the project maintainer through the project's GitHub repository."],
    },
  ],
};

export const terms: LegalDoc = {
  updated: "2026-11-18",
  sections: [
    {
      id: "agreement",
      title: "Agreement",
      body: [
        "By creating an account or playing, you agree to these terms. If you don't agree, don't use the service. VOLLEY.EXE is a free, non-commercial project provided as is.",
      ],
    },
    {
      id: "account",
      title: "Your account",
      list: [
        "You must be at least 13 years old.",
        "Keep your password secret; you're responsible for activity on your account.",
        "One person, one account. Usernames that impersonate others or are offensive may be changed or removed.",
      ],
    },
    {
      id: "fair-play",
      title: "Fair play",
      list: [
        "Don't cheat, automate gameplay, or exploit bugs to win.",
        "Don't harass, threaten or spam other players. Use Block if someone bothers you.",
        "Don't try to break, overload or gain unauthorised access to the service.",
      ],
    },
    {
      id: "content",
      title: "Content you upload",
      body: [
        "You keep the rights to your avatar and messages. You give us permission to store and display them to run the service. Don't upload anything illegal or that you don't have the right to share.",
      ],
    },
    {
      id: "termination",
      title: "Suspension and deletion",
      body: [
        "We may suspend accounts that break these terms. You can stop using the service and ask for your account to be deleted at any time.",
      ],
    },
    {
      id: "liability",
      title: "No warranty",
      body: [
        "The service may change, be unavailable or lose data without notice. To the extent the law allows, we aren't liable for any loss arising from its use.",
      ],
    },
    {
      id: "changes",
      title: "Changes",
      body: ["We may update these terms. The date above shows the latest version; continuing to use the service means you accept it."],
    },
  ],
};
