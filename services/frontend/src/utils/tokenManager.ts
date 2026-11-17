// Simple token storage in localStorage - persists across page reloads
const TOKEN_KEY = 'ft_transcendence_access_token';

/**
 * Decode JWT token to get user information
 */
export const decodeToken = (token: string): { id?: number; username?: string; email?: string } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Get current user ID from stored token
 */
export const getCurrentUserId = (): number | null => {
  const token = getAccessToken();
  if (!token) return null;
  const decoded = decodeToken(token);
  return decoded?.id || null;
};

/**
 * Store access token in localStorage (persists across page reloads)
 * Checks if a different user is already logged in and handles it
 */
export const setAccessToken = (token: string, newUserId?: number): boolean => {
  try {
    // Decode new user info from token or use provided userId
    const newUser = newUserId !== undefined ? { id: newUserId } : decodeToken(token);
    
    // Check if there's already a token for a different user
    const existingToken = getAccessToken();
    let existingUser = null;
    
    if (existingToken) {
      existingUser = decodeToken(existingToken);
      
      // If different user is logged in, clear the old token and notify
      if (existingUser?.id && newUser?.id && existingUser.id !== newUser.id) {
        console.warn(`Different user detected. Previous user ID: ${existingUser.id}, New user ID: ${newUser.id}`);
        // Clear old token
        localStorage.removeItem(TOKEN_KEY);
        // Dispatch event to notify other tabs/windows
        window.dispatchEvent(new CustomEvent('userSwitched', { 
          detail: { 
            previousUserId: existingUser.id, 
            newUserId: newUser.id 
          } 
        }));
      }
    }
    
    localStorage.setItem(TOKEN_KEY, token);
    
    // Dispatch storage event for other tabs/windows (only fires in other tabs)
    // For current tab, we dispatch a custom event
    if (existingToken !== token) {
      // Notify current tab about token change
      window.dispatchEvent(new CustomEvent('tokenChanged', {
        detail: {
          newToken: token,
          oldToken: existingToken,
          newUserId: newUser?.id,
          previousUserId: existingUser?.id
        }
      }));
    }
    
    return true;
  } catch (error) {
    console.error('Failed to store token in localStorage:', error);
    return false;
  }
};

/**
 * Get access token from localStorage
 */
export const getAccessToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to read token from localStorage:', error);
    return null;
  }
};

/**
 * Clear access token from localStorage
 */
export const clearAccessToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear token from localStorage:', error);
  }
};

// ---------------------------------------------------------------------------
// Session refresh. The backend keeps the real session in httpOnly cookies (a 15-minute
// access token plus a rotating refresh token). This legacy app still mirrors the access
// token in localStorage for its Bearer header until the Next.js app replaces it.
// ---------------------------------------------------------------------------

/** `expired`: the server refused the refresh (log out). `error`: transient, keep the session. */
export type RefreshResult = 'ok' | 'expired' | 'error';

let refreshInFlight: Promise<RefreshResult> | null = null;

const doRefresh = async (tokenBefore: string | null): Promise<RefreshResult> => {
  // Another tab may have refreshed while we waited for the lock; reuse its token.
  const current = getAccessToken();
  if (current && current !== tokenBefore) return 'ok';
  try {
    const res = await fetch(`${window.location.origin}/auth/refresh`, {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (res.status === 401) return 'expired';
    if (!res.ok) return 'error';
    const data = await res.json();
    if (data?.token && data?.user?.id) {
      setAccessToken(data.token, data.user.id);
      return 'ok';
    }
    return 'error';
  } catch {
    return 'error';
  }
};

/**
 * Exchanges the refresh cookie for a new access token. Refresh tokens rotate and a reused
 * one revokes the session, so calls are serialised within the tab (shared promise) and
 * across tabs (Web Locks, where available).
 */
export const refreshSession = (): Promise<RefreshResult> => {
  if (!refreshInFlight) {
    const tokenBefore = getAccessToken();
    const run = () => doRefresh(tokenBefore);
    const locks = (navigator as Navigator & { locks?: LockManager }).locks;
    const pending: Promise<RefreshResult> = locks
      ? (locks.request('ft-auth-refresh', run) as unknown as Promise<RefreshResult>) // request() resolves to the callback's result
      : run();
    refreshInFlight = pending.finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

/**
 * Fetch with the Bearer token; on a 401, refresh the session once and retry.
 * `buildInit` is called per attempt so the retry carries the new token.
 * A transient refresh failure (network, 429) throws instead of returning the 401, so
 * callers don't treat it as a logout.
 */
export const fetchWithRefresh = async (
  url: string,
  buildInit: (token: string | null) => RequestInit
): Promise<Response> => {
  const first = await fetch(url, buildInit(getAccessToken()));
  if (first.status !== 401) return first;
  const result = await refreshSession();
  if (result === 'expired') return first;
  if (result === 'error') throw new Error('Could not refresh the session. Please try again.');
  return fetch(url, buildInit(getAccessToken()));
};

/**
 * Check if user has a stored token (simple check for "remember me" functionality)
 */
export const hasStoredToken = (): boolean => {
  return getAccessToken() !== null;
};


