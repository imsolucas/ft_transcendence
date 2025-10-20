import { LandingPage } from "./pages/landingPage";
import { AuthPage } from "./pages/authPage";
import { MainPage } from "./pages/lobby";
import { ProfilePage } from "./pages/profilePage";
import { LoadingPong } from "./components/loadingGame";
import { initializeAuthPage, cleanupAuthPage, isAuthenticated } from "./utils/auth-script";

export type Screen = "landing" | "auth" | "main" | "game" | "profile" | "email-verification";

let currentScreen: Screen | null = null;
let activeTab: string | undefined;

export function navigate(screen: Screen, tab?: string) {
  activeTab = tab;
  const path = screen === 'landing' ? '/' : `/${screen}`;
  
  // only push state if the path is different
  if (window.location.pathname !== path) {
    history.pushState({ screen }, '', path);
  }
  
  renderPage(screen);
}

export function getActiveTab() {
  const tab = activeTab;
  activeTab = undefined;
  return tab;
}

export function renderPage(screen: Screen) {
  const container = document.getElementById("page-container");
  if (!container) return;

  const redirectedScreen = checkAuthAndRedirect(screen);
  if (redirectedScreen !== screen) {
    navigate(redirectedScreen);
    return;
  }

  cleanup(currentScreen);
  container.innerHTML = "";

  switch (screen) {
    case "landing":
      container.appendChild(LandingPage());
      break;
    case "auth":
      container.appendChild(AuthPage());
      setTimeout(() => {
        initializeAuthPage();
      }, 0);
      break;
    case "main":
      container.appendChild(MainPage());
      break;
    case "profile":
      container.appendChild(ProfilePage());
      break;
  }

  currentScreen = screen;
}

function checkAuthAndRedirect(requestedScreen: Screen): Screen {
  const isLoggedIn = isAuthenticated();
  const protectedScreens: Screen[] = ["main", "game", "profile"];
  const guestOnlyScreens: Screen[] = ["auth"];

  if (isLoggedIn) {
    if (guestOnlyScreens.includes(requestedScreen)) {
      console.log(`Redirecting logged-in user from ${requestedScreen} to main`);
      return "main";
    }
  } else {
    if (protectedScreens.includes(requestedScreen)) {
      console.log(`Redirecting non-authenticated user from ${requestedScreen} to landing`);
      return "landing";
    }
  }

  return requestedScreen;
}

function cleanup(screen: Screen | null) {
  if (screen === "auth") {
    cleanupAuthPage();
  }
}

export function getCurrentScreen(): Screen | null {
  return currentScreen;
}

function handleLocationChange() {
  const path = window.location.pathname;
  const screen = (path.substring(1) || "landing") as Screen;
  renderPage(screen);
}

export function initializeApp(): void {
  window.addEventListener('popstate', handleLocationChange);
  handleLocationChange(); // Handle initial load
}