// Simple token storage in localStorage - persists across page reloads
const TOKEN_KEY = 'ft_transcendence_access_token';

/**
 * Store access token in localStorage (persists across page reloads)
 */
export const setAccessToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store token in localStorage:', error);
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

/**
 * Attempt to refresh token on app initialization
 * If refresh fails but we have a stored token, keep it (let API calls handle validation)
 */
export const attemptSilentRefresh = async (): Promise<boolean> => {
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:8443';
  
  // If we already have a stored token, try to use it first
  const storedToken = getAccessToken();
  if (storedToken) {
    // Verify token is still valid by making a simple API call
    try {
      const verifyResponse = await fetch(`${API_URL}/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
        credentials: 'include',
      });

      if (verifyResponse.ok) {
        // Token is still valid, no need to refresh
        return true;
      }
    } catch (error) {
      // Network error or token invalid, try refresh
      console.log('Stored token invalid, attempting refresh...');
    }
  }

  // Try to refresh token using refresh token cookie
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Include cookies (refresh token)
    });

    if (!response.ok) {
      // No valid refresh token, clear stored token
      clearAccessToken();
      return false;
    }

    const data = await response.json();
    if (data.token) {
      setAccessToken(data.token);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    // Don't clear token on network errors - might be temporary
    return false;
  }
};

