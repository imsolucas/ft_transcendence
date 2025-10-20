/*
const API_URL = 'http://localhost:3000/api'; // Replace with your actual backend URL

// Function to get the JWT token from local storage
const getToken = () => {
  return localStorage.getItem('jwt');
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
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response.json();
};
*/

import { getCurrentUser } from './auth-script';


export const fetchUserProfile = async (userId: string) => {
  // return apiFetch(`${API_URL}/users/${userId}`);
  console.log(userId);
  const user = getCurrentUser();
  return {
    username: user?.username || 'Lucas',
    email: user?.email || 'lucas@example.com',
    picture: user?.picture,
    level: 10,
    wins: 15,
    losses: 5,
    winRate: '75%',
  }
};

export const updateUserProfile = async (userId: string, data: any) => {
  // return apiFetch(`${API_URL}/users/${userId}`, {
  //   method: 'PATCH',
  //   body: JSON.stringify(data),
  // });
  console.log(userId, data);
  return { ...data };
};

export const fetchMatchHistory = async (userId: string) => {
  // return apiFetch(`${API_URL}/users/${userId}/matches`);
  console.log(userId)
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
    },
    {
      opponent: {
        username: 'Player4',
        picture: '/images/pong.png'
      },
      result: 'WIN',
      score: '10 - 0',
      type: 'Ranked Match',
      timestamp: '3 days ago'
    }
  ];
};

export const fetchFriends = async (userId: string) => {
  // return apiFetch(`${API_URL}/users/${userId}/friends`);
  console.log(userId);
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
    },
    {
      username: 'Friend3',
      picture: '/images/pong.png',
      status: 'In Game'
    }
  ];
};

export const uploadProfilePicture = async (userId: string, file: File) => {
  // const formData = new FormData();
  // formData.append('file', file);
  // return apiFetch(`${API_URL}/users/${userId}/upload-picture`, {
  //   method: 'POST',
  //   body: formData,
  // });
  console.log(userId, file);
  return { picture: '/images/f1intro.jpg' };
};