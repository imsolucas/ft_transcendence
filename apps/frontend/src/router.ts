import { LandingPage } from "./pages/landing";
import { RegistrationPage } from "./pages/register";
import { MainPage } from "./pages/main";

export type Screen = "landing" | "login" | "main" | "registration" | "game" | "profile" | "email-verification";

export function navigate(screen: Screen) {
  renderPage(screen);
}

export function renderPage(screen: Screen) {
  const container = document.getElementById("page-container");
  if (!container) return;

  // clear old page
  container.innerHTML = "";

  switch (screen) {
    case "landing":
      container.appendChild(LandingPage());
      break;
    case "main":
      container.appendChild(MainPage());
      break;
    case "registration":
      container.appendChild(RegistrationPage());
      break;
  }
}
