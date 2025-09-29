import { LandingPage } from "./pages/landingPage";
import { AuthPage } from "./pages/authPage"; // Renamed from landing
import { MainPage } from "./pages/lobby";
import { ProfilePage } from "./pages/profilePage";
import { initializeAuthPage, cleanupAuthPage, isAuthenticated } from "./utils/auth-script"; // Renamed from landing-script

export type Screen = "landing" | "auth" | "main" | "game" | "profile" | "email-verification";

let currentScreen: Screen | null = null;
let activeTab: string | undefined;

export function navigate(screen: Screen, tab?: string) {
  activeTab = tab;
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
  
  // Check authentication and redirect if necessary
  const redirectedScreen = checkAuthAndRedirect(screen);
  if (redirectedScreen !== screen) {
    screen = redirectedScreen;
  }
  
  // Cleanup previous page
  cleanup(currentScreen);
  
  // Clear old page
  container.innerHTML = "";
  
  switch (screen) {
    case "landing":
      // New introduction page - accessible to everyone
      container.appendChild(LandingPage());
      break;
    case "auth":
      // Login/Registration page - only for non-authenticated users
      container.appendChild(AuthPage());
      setTimeout(() => {
        initializeAuthPage();
      }, 0);
      break;
    case "main":
      // Main dashboard - only for authenticated users
      container.appendChild(MainPage());
      break;
    case "profile":
      // Profile page - only for authenticated users
      container.appendChild(ProfilePage());
      break;
  }
  
  currentScreen = screen;
}

function checkAuthAndRedirect(requestedScreen: Screen): Screen {
  const isLoggedIn = isAuthenticated();
  
  // Define which screens require authentication
    const protectedScreens: Screen[] = ["main", "game", "profile"];
  
  // Define which screens are only for non-authenticated users
  const guestOnlyScreens: Screen[] = ["auth"];
  
  // Landing page is accessible to everyone, no restrictions
  
  if (isLoggedIn) {
    // User is logged in
    if (guestOnlyScreens.includes(requestedScreen)) {
      // Redirect logged-in users away from auth page
      console.log(`Redirecting logged-in user from ${requestedScreen} to main`);
      return "main";
    }
  } else {
    // User is not logged in
    if (protectedScreens.includes(requestedScreen)) {
      // Redirect non-authenticated users to landing page
      console.log(`Redirecting non-authenticated user from ${requestedScreen} to landing`);
      return "landing";
    }
  }
  
  // No redirection needed
  return requestedScreen;
}

function cleanup(screen: Screen | null) {
  switch (screen) {
    case "auth":
      cleanupAuthPage();
      break;
  }
}

// Function to get current screen
export function getCurrentScreen(): Screen | null {
  return currentScreen;
}

// Function to initialize the app with proper routing
export function initializeApp(): void {
  // Always start with the landing page (introduction)
  // Users can navigate to auth or main from there
  renderPage("landing");
}