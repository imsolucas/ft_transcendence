import type { Screen, NavigationState } from './types';
import { pageRegistry } from './pageRegistry';
import { checkAuthGuard } from './authGuard';

const state: NavigationState = {
  currentScreen: null,
  activeTab: undefined,
  queryParams: undefined,
};

export function navigate(screen: Screen, queryString?: string): void {
  // Parse query string if provided (format: "key=value" or "key1=value1&key2=value2")
  if (queryString) {
    const params: Record<string, string> = {};
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });
    state.queryParams = params;
  } else {
    state.queryParams = undefined;
  }

  const path = screen === "landing" ? "/" : `/${screen}`;
  const fullPath = queryString ? `${path}?${queryString}` : path;

  if (window.location.pathname + window.location.search !== fullPath) {
    history.pushState({ screen }, "", fullPath);
  }

  renderPage(screen);
}

export function getQueryParams(): Record<string, string> | undefined {
  // Parse query params from URL if state doesn't have them
  if (!state.queryParams) {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.toString()) {
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return params;
    }
    return undefined;
  }
  return state.queryParams;
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

  // Parse query params from URL
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.toString()) {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    state.queryParams = params;
  } else {
    state.queryParams = undefined;
  }

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
