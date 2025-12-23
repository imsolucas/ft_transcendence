import { isAuthenticated } from '../utils/auth-script';
import type { Screen } from './types';

const PUBLIC_SCREENS: Screen[] = ["landing", "auth", "email-verification", "privacy-policy", "terms-of-service"];

export function checkAuthGuard(requestedScreen: Screen): Screen {
  const isLoggedIn = isAuthenticated();

  if (!isLoggedIn && !PUBLIC_SCREENS.includes(requestedScreen)) {
    console.log(`Redirecting guest from ${requestedScreen} to auth`);
    return "auth";
  }

  if (isLoggedIn && requestedScreen === "auth") {
    console.log(`Redirecting logged-in user from auth to lobby`);
    return "lobby";
  }

  return requestedScreen;
}
