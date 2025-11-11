import { getCurrentUser } from './auth-script';

// API Configuration
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// Helper function to get auth token
const getToken = () => {
  return localStorage.getItem('authToken');
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

  // Handle 401 Unauthorized - token might be invalid or expired
  if (response.status === 401) {
    // Clear invalid token
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.error('Unauthorized: Token invalid or expired');
    
    // Only redirect if we're not already on auth/landing page
    const currentPath = window.location.pathname;
    if (!currentPath.includes('/auth') && !currentPath.includes('/landing') && currentPath !== '/') {
      // Dispatch event to trigger navbar update and redirect
      window.dispatchEvent(new CustomEvent('authExpired'));
      // Small delay to allow event handlers to process
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

// User Profile Operations
export const fetchUserProfile = async () => {
  try {
    // Use authenticated endpoint to get current user profile
    const user = await apiFetch(`${API_URL}/user/profile`);
    
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
    
    return {
      id: user.id,
      username: user.username || user.name,
      email: user.email,
      picture: user.avatar,
      level: user.level || 1,
      wins: wins,
      losses: losses,
      winRate: winRate,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Fallback to current user data from localStorage
    const currentUser = await getCurrentUser();
    return {
      id: currentUser?.id,
      username: currentUser?.username || 'Unknown',
      email: currentUser?.email || '',
      picture: currentUser?.picture,
      level: 1,
      wins: 0,
      losses: 0,
      winRate: '0%',
    };
  }
};

export const fetchUserByUsername = async (username: string) => {
  // Note: Backend doesn't have a username lookup endpoint
  // This function is kept for compatibility but will fail
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

    const updatedUser = await apiFetch(`${API_URL}/user/profile`, {
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
    const matches = await apiFetch(`${API_URL}/user/match-history`);
    return matches.map((match: any) => {
      // Determine if current user is player1 or player2
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const isPlayer1 = match.player1Id === currentUser.id;
      const opponent = isPlayer1 ? match.player2DisplayName : match.player1DisplayName;
      const myScore = isPlayer1 ? match.player1Score : match.player2Score;
      const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
      const result = myScore > opponentScore ? 'WIN' : myScore < opponentScore ? 'LOSS' : 'DRAW';
      
      return {
        opponent: {
          username: opponent || 'Unknown',
          picture: '/images/pong.png'
        },
        result: result,
        score: `${myScore} - ${opponentScore}`,
        type: 'Match',
        timestamp: new Date(match.played_at).toLocaleDateString()
      };
    });
  } catch (error) {
    console.error('Error fetching match history:', error);
    return [];
  }
};

export const fetchFriends = async () => {
  try {
    const friends = await apiFetch(`${API_URL}/user/friends`);
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
    const result = await apiFetch(`${API_URL}/user/friend-request`, {
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
    const requests = await apiFetch(`${API_URL}/user/friend-request${queryParam}`);
    return requests;
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    throw error;
  }
};

export const updateFriendRequest = async (requestId: number, status: 'ACCEPTED' | 'REJECTED') => {
  try {
    const result = await apiFetch(`${API_URL}/user/friend-request/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return result;
  } catch (error) {
    console.error('Error updating friend request:', error);
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