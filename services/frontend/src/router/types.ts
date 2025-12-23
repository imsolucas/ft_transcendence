export type Screen =
  | "landing"
  | "auth"
  | "lobby"
  | "game"
  | "profile"
  | "friends"
  | "email-verification"
  | "local-game"
  | "multiplayer-game"
  | "privacy-policy"
  | "terms-of-service";

export interface PageComponent {
  render: () => HTMLElement;
  cleanup?: () => void;
  requiresAuth?: boolean;
}

export interface NavigationState {
  currentScreen: Screen | null;
  activeTab?: string;
  queryParams?: Record<string, string>;
}
