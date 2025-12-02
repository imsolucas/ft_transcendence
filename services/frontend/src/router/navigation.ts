import type { Screen, NavigationState } from './types';
import { pageRegistry } from './pageRegistry';
import { checkAuthGuard } from './authGuard';

const state: NavigationState = {
  currentScreen: null,
  activeTab: undefined,
};

export function navigate(screen: Screen, tab?: string): void {
  state.activeTab = tab;
  const path = screen === "landing" ? "/" : `/${screen}`;

  if (window.location.pathname !== path) {
    history.pushState({ screen }, "", path);
  }

  renderPage(screen);
}

export function getActiveTab(): string | undefined {
  const tab = state.activeTab;
  state.activeTab = undefined;
  return tab;
}

export function getCurrentScreen(): Screen | null {
  return state.currentScreen;
}

export function renderPage(screen: Screen): void {
  const container = document.getElementById("page-container");
  if (!container) {
    console.error("page-container element not found");
    return;
  }

  // Validate screen exists before auth check to avoid redirecting to invalid screens
  if (!pageRegistry[screen]) {
    console.warn(`Unknown screen: ${screen}, redirecting to landing`);
    if (screen !== "landing") {
      navigate("landing");
      return;
    }
  }

  // Check auth and redirect if needed
  const redirectedScreen = checkAuthGuard(screen);
  if (redirectedScreen !== screen) {
    // Prevent infinite loop: only redirect if we're not already redirecting
    if (state.currentScreen !== redirectedScreen) {
      navigate(redirectedScreen);
    }
    return;
  }

  // Cleanup before rendering to prevent race conditions
  cleanupCurrentPage();

  const page = pageRegistry[screen];
  if (page) {
    try {
      container.innerHTML = "";
      const element = page.render();
      container.appendChild(element);
      state.currentScreen = screen;
    } catch (error) {
      console.error(`Error rendering ${screen}:`, error);
      // Fallback to landing if render fails
      if (screen !== "landing") {
        navigate("landing");
      }
    }
  }
}

function cleanupCurrentPage(): void {
  if (state.currentScreen) {
    const page = pageRegistry[state.currentScreen];
    if (page?.cleanup) {
      try {
        page.cleanup();
      } catch (error) {
        console.error(`Error cleaning up ${state.currentScreen}:`, error);
      }
    }
  }
}

function handleLocationChange(): void {
  const path = window.location.pathname;
  const pathScreen = path.substring(1) || "landing";

  // Validate the path is a valid screen
  const validScreens = Object.keys(pageRegistry);
  const screen = validScreens.includes(pathScreen)
    ? (pathScreen as Screen)
    : "landing";

  if (pathScreen !== screen) {
    console.warn(`Invalid path: ${path}, redirecting to landing`);
  }

  renderPage(screen);
}

export function initializeApp(): void {
  window.addEventListener("popstate", handleLocationChange);
  handleLocationChange();
}
