export type Screen =
  | "landing"
  | "auth"
  | "lobby"
  | "game"
  | "profile"
  | "email-verification"
  | "local-game"
  | "multiplayer-game";

export interface PageComponent {
  render: () => HTMLElement;
  cleanup?: () => void;
  requiresAuth?: boolean;
}

export interface NavigationState {
  currentScreen: Screen | null;
  activeTab?: string;
}
