import { LandingPage } from "./pages/landing";
import { MainPage } from "./pages/main";
import { initializeLandingPage, cleanupLandingPage } from "./utils/landing-script";

export type Screen = "landing" | "login" | "main" | "registration" | "game" | "profile" | "email-verification";

let currentScreen: Screen | null = null;

export function navigate(screen: Screen) {
  renderPage(screen);
}

export function renderPage(screen: Screen) {
  const container = document.getElementById("page-container");
  if (!container) return;
  
  // Cleanup previous page
  cleanup(currentScreen);
  
  // Clear old page
  container.innerHTML = "";
  
  switch (screen) {
    case "landing":
      container.appendChild(LandingPage());
      // Initialize landing page interactions after DOM is ready
      setTimeout(() => {
        initializeLandingPage();
      }, 0);
      break;
    case "main":
      container.appendChild(MainPage());
      break;
  }
  
  currentScreen = screen;
}

function cleanup(screen: Screen | null) {
  switch (screen) {
    case "landing":
      cleanupLandingPage();
      break;
  }
}