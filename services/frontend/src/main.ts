import './styles/style.css'
import './i18n';
import { initializeApp } from "./router";
import { initializeNavbar, updateNavbar } from "./components/layout/Navbar";
import { hasStoredToken, decodeToken } from "./utils/tokenManager";
// Initialize Stimulus framework
import './controllers';

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

  // Listen for storage changes (when user logs in/out in another tab/window)
  // Note: StorageEvent only fires in OTHER tabs, not the current tab
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === 'ft_transcendence_access_token') {
      console.log('Token changed in another tab/window');
      // Update navbar to reflect new auth state
      updateNavbar();
      
      // If token was removed, redirect to landing page
      if (!e.newValue && e.oldValue) {
        console.log('User logged out in another tab/window');
        window.dispatchEvent(new CustomEvent('authExpired'));
        setTimeout(() => {
          if (window.location.pathname !== '/' && !window.location.pathname.includes('/auth') && !window.location.pathname.includes('/landing')) {
            window.location.href = '/';
          }
        }, 100);
      } else if (
        e.newValue && e.oldValue && e.newValue !== e.oldValue &&
        // A routine 15-minute token refresh rewrites the token for the SAME user; only a
        // different user id means someone else logged in.
        decodeToken(e.newValue)?.id !== decodeToken(e.oldValue)?.id
      ) {
        // Token changed (different user logged in)
        console.log('Different user logged in in another tab/window');
        updateNavbar();
        window.dispatchEvent(new CustomEvent('authExpired'));
        setTimeout(() => {
          if (window.location.pathname !== '/' && !window.location.pathname.includes('/auth') && !window.location.pathname.includes('/landing')) {
            window.location.href = '/';
          }
        }, 100);
      }
    }
  });
  
  // Listen for token changes in CURRENT tab (when setAccessToken is called)
  window.addEventListener('tokenChanged', ((e: CustomEvent) => {
    const { newUserId, previousUserId } = e.detail;
    console.log('Token changed in current tab', { previousUserId, newUserId });
    
    // If different user logged in, update navbar and redirect
    if (previousUserId && newUserId && previousUserId !== newUserId) {
      console.log('Different user logged in in current tab');
      updateNavbar();
      window.dispatchEvent(new CustomEvent('authExpired'));
      setTimeout(() => {
        if (window.location.pathname !== '/' && !window.location.pathname.includes('/auth') && !window.location.pathname.includes('/landing')) {
          window.location.href = '/';
        }
      }, 100);
    } else {
      // Same user or new login - just update navbar
      updateNavbar();
    }
  }) as EventListener);
  
  // Listen for user switch events (when different user logs in)
  window.addEventListener('userSwitched', ((e: CustomEvent) => {
    console.log('User switched event', e.detail);
    // Update navbar and potentially redirect
    updateNavbar();
    window.dispatchEvent(new CustomEvent('authExpired'));
    setTimeout(() => {
      if (window.location.pathname !== '/' && !window.location.pathname.includes('/auth') && !window.location.pathname.includes('/landing')) {
        window.location.href = '/';
      }
    }, 100);
  }) as EventListener);
  
  // Initialize app asynchronously
  (async () => {
    // Check if user has a stored token
    const hasToken = hasStoredToken();
    if (hasToken) {
      console.log('Token found in localStorage');
    } else {
      console.log('No token found');
    }
    
    // Initialize navbar
    await initializeNavbar();
    
    // If token exists, update navbar to reflect authenticated state
    if (hasToken) {
      await updateNavbar();
    }
    
    // Initialize app with proper routing based on auth state
    initializeApp();
  })();
}