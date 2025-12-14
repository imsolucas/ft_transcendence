// In-memory token storage - never persisted to localStorage/sessionStorage
let accessToken: string | null = null;

export const setAccessToken = (token: string): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

export const clearAccessToken = (): void => {
  accessToken = null;
};

// Attempt to refresh token on app initialization
export const attemptSilentRefresh = async (): Promise<boolean> => {
  try {
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    console.log('Attempting silent refresh to:', `${API_URL}/auth/refresh`);
    
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Include cookies - this is critical!
      // Don't send Content-Type header - refresh endpoint uses cookies, no body needed
    });

    console.log('Silent refresh response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error('Silent refresh failed:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    if (data.token) {
      setAccessToken(data.token);
      // User data is fetched from API when needed, not stored in localStorage
      return true;
    }

    return false;
  } catch (error) {
    console.error('Silent refresh failed:', error);
    return false;
  }
};

