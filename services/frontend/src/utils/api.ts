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
  }

  const response = await fetch(url, { ...options, headers });

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
export const fetchUserProfile = async (userId: string) => {
  try {
    // Try to fetch by ID first
    const user = await apiFetch(`${API_URL}/users/${userId}`);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      picture: user.avatar,
      level: user.level || 1,
      wins: user.wins || 0,
      losses: user.losses || 0,
      winRate: user.winRate || '0%',
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
      wins: 0,
      losses: 0,
      winRate: '0%',
    };
  }
};

export const fetchUserByUsername = async (username: string) => {
//   console.log(API_URL);
  try {
    const user = await apiFetch(`${API_URL}/users/${username}`);
	console.log(user);
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      picture: user.avatar,
      level: user.level || 1,
      wins: user.wins || 0,
      losses: user.losses || 0,
      winRate: user.winRate || '0%',
    };
  } catch (error) {
    console.error('Error fetching user by username:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, data: any) => {
  try {
    const updateData: any = {};
    
    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;
    if (data.avatar) updateData.avatar = data.avatar;

    const updatedUser = await apiFetch(`${API_URL}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      picture: updatedUser.avatar,
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

export const fetchMatchHistory = async (userId: string) => {
  try {
    // This endpoint might need to be created in your backend
    const matches = await apiFetch(`${API_URL}/users/${userId}/matches`);
    return matches.map((match: any) => ({
      opponent: {
        username: match.opponentUsername || 'Unknown',
        picture: match.opponentAvatar || '/images/pong.png'
      },
      result: match.result || 'UNKNOWN',
      score: match.score || '0 - 0',
      type: match.type || 'Match',
      timestamp: match.timestamp || 'Unknown time'
    }));
  } catch (error) {
    console.error('Error fetching match history:', error);
    // Return mock data as fallback
    return [
      {
        opponent: {
          username: 'Player2',
          picture: '/images/pong.png'
        },
        result: 'WIN',
        score: '10 - 5',
        type: 'Ranked Match',
        timestamp: '2 hours ago'
      },
      {
        opponent: {
          username: 'Player3',
          picture: '/images/pong.png'
        },
        result: 'LOSS',
        score: '3 - 10',
        type: 'Friendly Match',
        timestamp: '1 day ago'
      }
    ];
  }
};

export const fetchFriends = async (userId: string) => {
  try {
    // This endpoint might need to be created in your backend
    const friends = await apiFetch(`${API_URL}/users/${userId}/friends`);
    return friends.map((friend: any) => ({
      username: friend.username || 'Unknown',
      picture: friend.avatar || '/images/pong.png',
      status: friend.status || 'Offline'
    }));
  } catch (error) {
    console.error('Error fetching friends:', error);
    // Return mock data as fallback
    return [
      {
        username: 'Friend1',
        picture: '/images/pong.png',
        status: 'Online'
      },
      {
        username: 'Friend2',
        picture: '/images/pong.png',
        status: 'Offline'
      }
    ];
  }
};

export const uploadProfilePicture = async (userId: string, file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // This endpoint might need to be created in your backend
    const response = await fetch(`${API_URL}/users/${userId}/upload-picture`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload profile picture');
    }
    
    const result = await response.json();
    return { picture: result.avatar || result.picture };
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

// Get all users (for admin/search functionality)
export const fetchAllUsers = async () => {
  try {
    const users = await apiFetch(`${API_URL}/users`);
    return users.map((user: any) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      picture: user.avatar,
    }));
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
};

// Delete user (for admin functionality)
export const deleteUser = async (userId: string) => {
  try {
    await apiFetch(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};