import './styles/style.css'
import { ThemeToggle } from "./components/theme-toggle";
import { renderPage } from "./router";

export function App(): HTMLElement {
  const app = document.createElement("div");
  app.className =
    "relative min-h-screen bg-gray-200 text-gray-900 dark:bg-gray-900 dark:text-white";

  // Global theme toggle
  const themeWrapper = document.createElement("div");
  themeWrapper.className = "absolute bottom-4 right-4";
  themeWrapper.appendChild(ThemeToggle());

  // Page container (where router injects pages)
  const pageContainer = document.createElement("div");
  pageContainer.id = "page-container";
  pageContainer.className = "flex items-center justify-center min-h-screen";

  app.appendChild(themeWrapper);
  app.appendChild(pageContainer);

  return app;
}

// Bootstrapping
const root = document.getElementById("app");
if (root) {
  root.appendChild(App());
  renderPage("landing"); // start with landing page
}

