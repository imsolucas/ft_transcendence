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

/**
 * Check if user has a stored token (simple check for "remember me" functionality)
 */
export const hasStoredToken = (): boolean => {
  return getAccessToken() !== null;
};


