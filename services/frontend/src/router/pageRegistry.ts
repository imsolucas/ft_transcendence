import { LandingPage } from '../pages/landingPage';
import { AuthPage } from '../pages/authPage';
import { LobbyPage } from '../pages/lobbyPage';
import { ProfilePage } from '../pages/profilePage';
import { LocalGamePage } from '../pages/LocalGameSetupPage';
import { MultiplayerGamePage } from '../pages/MultiplayerSetupPage';
import { GamePage, cleanupGamePage } from '../pages/gamePage';
import { cleanupAuthPage } from '../utils/auth-script';
import { gameStorage } from '../types/game';
import type { Screen, PageComponent } from './types';

export const pageRegistry: Record<Screen, PageComponent> = {
  landing: {
    render: () => LandingPage(),
    requiresAuth: false,
  },

  auth: {
    render: () => AuthPage(),
    cleanup: () => cleanupAuthPage(),
    requiresAuth: false,
  },

  lobby: {
    render: () => {
      gameStorage.clearGameOptions();
      return LobbyPage();
    },
    requiresAuth: true,
  },

  profile: {
    render: () => ProfilePage(),
    requiresAuth: true,
  },

  game: {
    render: () => GamePage(),
    cleanup: () => cleanupGamePage(),
    requiresAuth: true,
  },

  "local-game": {
    render: () => {
      gameStorage.clearGameOptions();
      return LocalGamePage();
    },
    requiresAuth: true,
  },

  "multiplayer-game": {
    render: () => {
      gameStorage.clearGameOptions();
      return MultiplayerGamePage();
    },
    requiresAuth: true,
  },

  "email-verification": {
    render: () => LandingPage(), // Placeholder
    requiresAuth: false,
  },
};
