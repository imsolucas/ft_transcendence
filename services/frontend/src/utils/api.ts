import { getCurrentUser } from './auth-script';
import { getAccessToken, clearAccessToken } from './tokenManager';
import process from 'process';

// API Configuration
// Use the current browser location to avoid hardcoding ports
export const API_DOMAIN = window.location.host
export const API_BASE_URL = `${window.location.protocol}//${API_DOMAIN}`

// Helper function to get auth token (from localStorage)
const getToken = () => {
  return getAccessToken();
};


// Helper function for making authenticated API requests
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('No auth token found for request to:', url);
  }

  const response = await fetch(url, { ...options, headers });

  // Handle 401 Unauthorized - token is invalid or expired
  if (response.status === 401) {
    // Try to call logout endpoint to set status to OFFLINE before clearing token
    // This works even with expired tokens because logout uses jwt.decode() which doesn't verify expiration
    const token = getToken();
    if (token) {
      try {
        // Call logout endpoint to set status to OFFLINE (non-blocking, fire and forget)
        // Use keepalive to ensure it completes even if page is closing
        fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          keepalive: true, // Ensure request completes even if page is closing
        }).catch(() => {
          // Ignore errors - token might be too expired or invalid, but we tried
        });
      } catch (error) {
        // Ignore errors
      }
    }

    // Clear token and redirect to login
    clearAccessToken();
    console.error('Unauthorized: Token invalid or expired');

    // Only redirect if we're not already on auth/landing page
    const currentPath = window.location.pathname;
    if (!currentPath.includes('/auth') && !currentPath.includes('/landing') && currentPath !== '/') {
      window.dispatchEvent(new CustomEvent('authExpired'));
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    }

    const errorData = await response.json().catch(() => ({ error: 'Unauthorized' }));
    throw new Error(errorData.error || 'Unauthorized: Please login again');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export async function setUserStatus(
	status: 'ONLINE' | 'OFFLINE' | 'INGAME' | 'online' | 'offline' | 'ingame',
  options?: { keepalive?: boolean }
): Promise<void> {
  try {
    const token = getToken();
    if (!token) return;
    const normalized = String(status).toUpperCase() as 'ONLINE' | 'OFFLINE' | 'INGAME';
    console.debug('[setUserStatus] sending:', normalized, 'keepalive=', options?.keepalive === true);
    const res = await fetch(`${API_BASE_URL}/user/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status: normalized }),
      keepalive: options?.keepalive === true,
    });
    try {
      const bodyText = await res.clone().text();
      console.debug('[setUserStatus] response:', res.status, bodyText || '<no body>');
    } catch (e) {
      console.debug('[setUserStatus] response:', res.status, '<unreadable body>');
    }
  } catch (error) {
    console.debug('Failed to update user status:', error);
  }
}

// User Profile Operations
export const fetchUserProfile = async () => {
  try {
    // Use authenticated endpoint to get current user profile
    const user = await apiFetch(`${API_BASE_URL}/user/profile`);

    // Calculate wins/losses from match history
    let wins = 0;
    let losses = 0;
    try {
      const matches = await fetchMatchHistory();
      matches.forEach((match: any) => {
        if (match.result === 'WIN') wins++;
        else if (match.result === 'LOSS') losses++;
      });
    } catch (error) {
      console.error('Error calculating stats from match history:', error);
    }

    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? `${Math.round((wins / totalGames) * 100)}%` : '0%';


    // Return profile - stats should be calculated separately using calculateUserStats()
    return {
      id: user.id,
      username: user.username || user.name,
      email: user.email,
      picture: user.avatar,
      level: user.level || 1,
      is2FAEnabled: user.is2FAEnabled || false,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Fallback to current user data
    const currentUser = await getCurrentUser();
    return {
      id: currentUser?.id,
      username: currentUser?.username || 'Unknown',
      email: currentUser?.email || '',
      picture: currentUser?.picture,
      level: 1,
      is2FAEnabled: (currentUser as any)?.is2FAEnabled || false,
    };
  }
};

export const getUserProfileByUsername = async (username: string) => {
  try {
    const user = await apiFetch(`${API_BASE_URL}/user/profile/${encodeURIComponent(username)}`);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      is2FAEnabled: user.is2FAEnabled || false,
    };
  } catch (error) {
    console.error('Error fetching user profile by username:', error);
    throw error;
  }
};

export const fetchUserByUsername = async (username: string) => {
  // Deprecated: Use getUserProfileByUsername instead
  // Use fetchUserProfile() instead for authenticated users
  try {
    // Try to use the profile endpoint if authenticated
    const profile = await fetchUserProfile();
    if (profile.username === username) {
      return profile;
    }
    throw new Error('User not found');
  } catch (error) {
    console.error('Error fetching user by username:', error);
    throw error;
  }
};

export const updateUserProfile = async (data: any) => {
  try {
    const updateData: any = {};

    // Backend expects 'username' field, not 'name' for updates
    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;
    if (data.avatar) updateData.avatar = data.avatar;

    const updatedUser = await apiFetch(`${API_BASE_URL}/user/profile`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username || updatedUser.name,
      email: updatedUser.email,
      picture: updatedUser.avatar,
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const fetchMatchHistory = async () => {
  try {
    // Get current user ID from token to avoid circular dependency with getCurrentUser()
    const token = getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    // Fetch matches from API
    const matches = await apiFetch(`${API_BASE_URL}/user/match-history`);

    // Decode token to get user ID (simple base64 decode, no verification needed for ID extraction)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentUserId = payload.id;

      return matches.map((match: any) => {
        // Determine if current user is player1 or player2
        const isPlayer1 = match.player1Id === currentUserId;
        const isPlayer2 = match.player2Id === currentUserId;

        // Get opponent information - the player who is NOT the current user
        let opponent: string;
        if (isPlayer1) {
          opponent = match.player2DisplayName || 'Unknown';
        } else if (isPlayer2) {
          opponent = match.player1DisplayName || 'Unknown';
        } else {
          // Fallback: shouldn't happen, but handle edge case
          opponent = 'Unknown';
        }

        const myScore = isPlayer1 ? match.player1Score : match.player2Score;
        const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
        const result = myScore > opponentScore ? 'WIN' : myScore < opponentScore ? 'LOSS' : 'DRAW';

        return {
          opponent: {
            username: opponent,
            picture: '/images/pong.png'
          },
          result: result,
          score: `${myScore} - ${opponentScore}`,
          type: 'Match',
          timestamp: new Date(match.played_at).toLocaleDateString()
        };
      });
    } catch (decodeError) {
      console.error('Error decoding token for user ID:', decodeError);
      // Fallback: return matches without result calculation
      return matches.map((match: any) => ({
        opponent: {
          username: match.player2DisplayName || match.player1DisplayName || 'Unknown',
          picture: '/images/pong.png'
        },
        result: 'DRAW',
        score: `${match.player1Score} - ${match.player2Score}`,
        type: 'Match',
        timestamp: new Date(match.played_at).toLocaleDateString()
      }));
    }
  } catch (error) {
    console.error('Error fetching match history:', error);
    throw error;
  }
};

// Calculate user statistics from match history
export const calculateUserStats = async () => {
  try {
    const matches = await fetchMatchHistory();
    let wins = 0;
    let losses = 0;

    matches.forEach((match: any) => {
      if (match.result === 'WIN') {
        wins++;
      } else if (match.result === 'LOSS') {
        losses++;
      }
    });

    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    // Calculate level based on wins (simple formula: level = 1 + Math.floor(wins / 5))
    const level = 1 + Math.floor(wins / 5);

    return {
      wins,
      losses,
      winRate: `${winRate}%`,
      level,
    };
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return {
      wins: 0,
      losses: 0,
      winRate: '0%',
      level: 1,
    };
  }
};

export const fetchFriends = async () => {
  try {
    const friends = await apiFetch(`${API_BASE_URL}/user/friends`);
    return friends.map((friend: any) => ({
      username: friend.username || 'Unknown',
      picture: friend.avatar || '/images/pong.png',
      status: friend.status === 'ONLINE' ? 'Online' : friend.status === 'INGAME' ? 'In Game' : 'Offline'
    }));
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
};

// Helper function to update profile with avatar
async function updateProfileWithAvatar(
  dataUrl: string,
  resolve: (value: { picture: string }) => void,
  reject: (reason?: any) => void
) {
  try {
    const updated = await updateUserProfile({ avatar: dataUrl });
    resolve({ picture: updated.picture || dataUrl });
  } catch (error) {
    reject(error);
  }
}

export const uploadProfilePicture = async (file: File) => {
  try {
    // Compress and resize image before converting to base64 to avoid NetworkError
    return new Promise<{ picture: string }>((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = async () => {
        const img = new Image();
        img.onload = () => {
          // Create canvas to resize and compress
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          const QUALITY = 0.8; // 80% quality

          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to data URL with compression
          const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);

          // Check if compressed size is still too large (max ~500KB base64 = ~375KB original)
          if (dataUrl.length > 500000) {
            // Try with lower quality
            const lowerQualityUrl = canvas.toDataURL('image/jpeg', 0.6);
            if (lowerQualityUrl.length > 500000) {
              reject(new Error('Image is too large even after compression. Please use a smaller image.'));
              return;
            }
            updateProfileWithAvatar(lowerQualityUrl, resolve, reject);
          } else {
            updateProfileWithAvatar(dataUrl, resolve, reject);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = reader.result as string;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

// Get all users (for admin/search functionality)
// Note: Backend doesn't have a GET /users endpoint in the OpenAPI spec
// This function is kept for compatibility but will return empty array
export const fetchAllUsers = async () => {
  try {
    // This endpoint doesn't exist in the backend
    console.warn('GET /users endpoint not available in backend');
    return [];
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
};

// Friend Request Operations
export const sendFriendRequest = async (username: string) => {
  try {
    const result = await apiFetch(`${API_BASE_URL}/user/friend-request`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    return result;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

export const getFriendRequests = async (direction?: 'sent' | 'received') => {
  try {
    const queryParam = direction ? `?direction=${direction}` : '';
    const requests = await apiFetch(`${API_BASE_URL}/user/friend-request${queryParam}`);
    // Debug logging to see what we're getting from the backend
    console.log('Friend requests received from backend:', requests);
    return requests;
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    throw error;
  }
};

export const updateFriendRequest = async (requestId: number, status: 'ACCEPTED' | 'REJECTED') => {
  try {
    const result = await apiFetch(`${API_BASE_URL}/user/friend-request/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return result;
  } catch (error) {
    console.error('Error updating friend request:', error);
    throw error;
  }
};

export const removeFriend = async (username: string) => {
  try {
    const result = await apiFetch(`${API_BASE_URL}/user/friends/${username}`, {
      method: 'DELETE',
      body: '{}',
    });
    return result;
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

export const searchUsers = async (query: string) => {
  try {
    const result = await apiFetch(`${API_BASE_URL}/user/search?q=${encodeURIComponent(query)}`);
    return result;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

// Delete user (for admin functionality)
// Note: Backend doesn't have a delete user endpoint in the OpenAPI spec
// This function is kept for compatibility but will fail
export const deleteUser = async (_userId: string) => {
  try {
    // This endpoint doesn't exist in the backend
    throw new Error('Delete user endpoint not available');
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// 2FA Operations
export const setup2FA = async () => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/user/2fa/setup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Send empty JSON body
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `API request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    throw error;
  }
};

export const verify2FACode = async (userId: number, code: string) => {
  try {
    const result = await fetch(`${API_BASE_URL}/auth/verify-2fa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, code }),
    });

    if (!result.ok) {
      const errorData = await result.json().catch(() => ({ error: result.statusText }));

      // Handle 403 - User already logged in on another device
      if (result.status === 403 && errorData?.error?.includes('already logged in')) {
        throw new Error(errorData.message || 'You are already logged in on another device or browser. Please log out from the other device before logging in here.');
      }

      throw new Error(errorData.error || 'Invalid 2FA code');
    }

    return await result.json();
  } catch (error) {
    console.error('Error verifying 2FA code:', error);
    throw error;
  }
};
