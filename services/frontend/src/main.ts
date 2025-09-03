import './styles/style.css'
import { renderPage } from "./router";

export function App(): HTMLElement {
  const app = document.createElement("div");
  app.className = "relative min-h-screen bg-gray-200 text-gray-900 dark:bg-gray-900 dark:text-white";
  
  // Page container (where router injects pages)
  const pageContainer = document.createElement("div");
  pageContainer.id = "page-container";
  // Remove flex centering for landing page - let pages control their own layout
  pageContainer.className = "min-h-screen w-full";
  
  app.appendChild(pageContainer);
  return app;
}

// Bootstrapping
const root = document.getElementById("app");
if (root) {
  root.appendChild(App());
  renderPage("landing"); // start with landing page
}