// Public API - single entry point for all routing functionality
export type { Screen, PageComponent, NavigationState } from './router/types';
export {
  navigate,
  getActiveTab,
  getCurrentScreen,
  getQueryParams,
  initializeApp
} from './router/navigation';

// Internal use only - exposed for testing/debugging
export { pageRegistry } from './router/pageRegistry';
export { checkAuthGuard } from './router/authGuard';
