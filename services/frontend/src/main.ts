import './styles/style.css'
import './i18n';
import { initializeApp } from "./router";
import { initializeNavbar } from "./components/layout/Navbar";

export function App(): HTMLElement {
  const app = document.createElement("div");
  app.className = "relative min-h-screen bg-gray-200 text-gray-900 dark:bg-gray-900 dark:text-white";

  // Page container (where router injects pages)
  const pageContainer = document.createElement("div");
  pageContainer.id = "page-container";
  pageContainer.className = "min-h-screen w-full";

  app.appendChild(pageContainer);
  return app;
}

// Bootstrapping
const root = document.getElementById("app");
if (root) {
  root.appendChild(App());

  // Initialize navbar first
  initializeNavbar();

  // Initialize app with proper routing based on auth state
  initializeApp();
}