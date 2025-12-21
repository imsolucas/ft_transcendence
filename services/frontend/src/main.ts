import './styles/style.css'
import './i18n';
import { initializeApp } from "./router";
import { initializeNavbar, updateNavbar } from "./components/layout/Navbar";
import { attemptSilentRefresh } from "./utils/tokenManager";
import Alpine from 'alpinejs';

// Initialize Alpine.js framework
declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
  interface HTMLElement {
    __x?: {
      $data: Record<string, any>;
    };
  }
}
window.Alpine = Alpine;
Alpine.start();

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

  // Attempt to restore session from localStorage or refresh token
  // This must complete before initializing navbar and app routing to prevent auth guard redirect
  attemptSilentRefresh().then(async (success) => {
    if (success) {
      console.log('Session restored');
    } else {
      console.log('No valid session found');
    }
    
    // Initialize navbar after silent refresh completes so it shows correct auth state
    await initializeNavbar();
    
    // If refresh was successful, ensure navbar reflects authenticated state
    if (success) {
      await updateNavbar();
    }
    
    // Initialize app with proper routing based on auth state
    initializeApp();
  }).catch(async (error) => {
    console.error('Failed to restore session:', error);
    // Continue initialization even if refresh fails
    await initializeNavbar();
    initializeApp();
  });
}