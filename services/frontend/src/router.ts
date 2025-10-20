import { LandingPage } from "./pages/landingPage";
import { AuthPage } from "./pages/authPage";
import { LobbyPage } from "./pages/lobby";
import { ProfilePage } from "./pages/profilePage";
import { LoadingPong } from "./components/loadingGame";
import { GamePage, cleanupGamePage } from "./pages/gamePage";
import { initializeAuthPage, cleanupAuthPage, isAuthenticated } from "./utils/auth-script";

// Define all possible screen names
export type Screen = "landing" | "auth" | "lobby" | "game" | "profile" | "email-verification";

// Track which screen we're currently showing
let currentScreen: Screen | null = null;
let activeTab: string | undefined;

// ✅ Simple navigation function
export function navigate(screen: Screen, tab?: string) {
  activeTab = tab;
  const path = screen === "landing" ? "/" : `/${screen}`;

  // Change URL only if it’s different
  if (window.location.pathname !== path) {
    history.pushState({ screen }, "", path);
  }

  renderPage(screen);
}

// Used to get a one-time tab value (optional)
export function getActiveTab() {
  const tab = activeTab;
  activeTab = undefined;
  return tab;
}

// ✅ Main function that shows the correct page
export function renderPage(screen: Screen) {
  const container = document.getElementById("page-container");
  if (!container) return;

  // 🔒 Check if the user should be redirected based on login status
  const redirectedScreen = checkAuthAndRedirect(screen);
  if (redirectedScreen !== screen) {
    navigate(redirectedScreen);
    return;
  }

  // Clear the old page content
  cleanup(currentScreen);
  container.innerHTML = "";

  // 🧱 Render the correct screen
  switch (screen) {
    case "landing":
      container.appendChild(LandingPage());
      break;

    case "auth":
      container.appendChild(AuthPage());
      setTimeout(() => initializeAuthPage(), 0);
      break;

    case "lobby":
      container.appendChild(LobbyPage());
      break;

    case "profile":
      container.appendChild(ProfilePage());
      break;

    case "game":
      container.appendChild(LoadingPong());
      break;

    default:
      container.appendChild(LandingPage());
  }

  currentScreen = screen;
}

// ✅ Simpler redirect logic (easy version)
function checkAuthAndRedirect(requestedScreen: Screen): Screen {
  const isLoggedIn = isAuthenticated();

  // Public pages
  const publicScreens: Screen[] = ["landing", "auth"];

  if (!isLoggedIn && !publicScreens.includes(requestedScreen)) {
    // ❌ Not logged in and trying to access a private page
    console.log(`Redirecting guest from ${requestedScreen} to landing`);
    return "landing";
  }

  if (isLoggedIn && requestedScreen === "auth") {
    // 🧾 Logged in but trying to access login page
    console.log(`Redirecting logged-in user from auth to lobby`);
    return "lobby";
  }

  // ✅ Otherwise, let them visit
  return requestedScreen;
}

// Cleanup specific pages (auth only for now)
function cleanup(screen: Screen | null) {
  switch (screen) {
    case "auth":
      cleanupAuthPage();
      break;
    case "game":
      cleanupGamePage();
      break;
  }
}

// Used for debugging or other logic
export function getCurrentScreen(): Screen | null {
  return currentScreen;
}

// Handle browser back/forward navigation
function handleLocationChange() {
  const path = window.location.pathname;
  const screen = (path.substring(1) || "landing") as Screen;
  renderPage(screen);
}

// Initialize app when it loads
export function initializeApp(): void {
  window.addEventListener("popstate", handleLocationChange);
  handleLocationChange(); // Handle first page load
}
