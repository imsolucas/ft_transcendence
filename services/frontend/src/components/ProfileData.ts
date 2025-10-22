
import { fetchUserProfile, updateUserProfile, fetchMatchHistory, fetchFriends, uploadProfilePicture } from '../utils/api';
import { getCurrentUser } from '../utils/auth-script';
import { getActiveTab } from '../router';

export function ProfileData() {
  const container = document.createElement('div');
  container.className = 'relative w-full md:w-[800px] h-full md:h-[800px] mx-auto bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-[0_0_50px_rgba(255,20,147,0.4)] overflow-hidden border-2 border-pink-400/30';

  const user = getCurrentUser();

  const renderMatchHistory = (matches: any[]) => {
    const matchHistoryContainer = container.querySelector('#match-history .space-y-4');
    if (!matchHistoryContainer) return;

    matchHistoryContainer.innerHTML = matches.map(match => `
      <div class="flex items-center justify-between bg-gray-800/70 p-4 rounded-lg hover:bg-gray-800 transition-all border-l-4 ${match.result === 'WIN' ? 'border-green-500' : 'border-red-500'}">
        <div class="flex items-center">
          <img src="${match.opponent.picture}" class="w-10 h-10 rounded-full mr-4 border-2 border-gray-600">
          <div>
            <p class="font-bold">vs. ${match.opponent.username}</p>
            <p class="text-sm text-gray-400">${match.type}</p>
          </div>
        </div>
        <div class="text-center">
          <p class="text-lg font-bold ${match.result === 'WIN' ? 'text-green-500' : 'text-red-500'}">${match.result}</p>
          <p class="text-sm">${match.score}</p>
        </div>
        <p class="text-sm text-gray-500">${match.timestamp}</p>
      </div>
    `).join('');
  };

  const renderFriendsList = (friends: any[]) => {
    const friendsListContainer = container.querySelector('#friends .space-y-3');
    if (!friendsListContainer) return;

    friendsListContainer.innerHTML = friends.map(friend => `
      <div class="flex items-center justify-between bg-gray-800/70 p-3 rounded-lg">
        <div class="flex items-center">
          <img src="${friend.picture}" class="w-10 h-10 rounded-full mr-4">
          <span class="font-bold">${friend.username}</span>
        </div>
        <span class="${friend.status === 'Online' ? 'text-green-500' : (friend.status === 'In Game' ? 'text-yellow-500' : 'text-gray-500')}">${friend.status}</span>
      </div>
    `).join('');
  };

  const render = (profileData: any) => {
    container.innerHTML = `
      <!-- Retro grid and glowing orbs -->
      <div class="absolute inset-0 opacity-10 pointer-events-none">
        <div class="grid-pattern"></div>
      </div>
      <div class="absolute top-8 right-8 w-10 h-10 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_20px_#00ffff]"></div>
      <div class="absolute bottom-8 left-8 w-8 h-8 rounded-full bg-pink-400 animate-pulse shadow-[0_0_15px_#ff1493] animation-delay-500"></div>

      <div class="relative z-10 p-8 md:p-12 h-full overflow-y-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Left Column: User Info -->
          <div class="text-center flex flex-col items-center">
            <div class="relative mb-6">
              <img src="${profileData.picture || '/images/pong.png'}" alt="User Avatar" class="w-40 h-40 rounded-full border-4 border-cyan-400 shadow-[0_0_30px_rgba(0,255,255,0.6)] object-cover">
              <button id="camera-button" class="absolute bottom-0 right-0 w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center border-2 border-gray-900 hover:bg-pink-600 transition-all transform hover:scale-110">
                <i class="bx bxs-camera text-xl"></i>
              </button>
            </div>
            <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">${profileData.username || 'USER_NAME'}</h1>
            <p class="text-cyan-300">Level ${profileData.level || 42}</p>
            
            <div class="w-full mt-8">
              <h3 class="text-xl font-semibold text-pink-300 mb-4 tracking-wider uppercase">Stats</h3>
              <div class="space-y-3 text-left">
                <div class="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border-l-4 border-cyan-400">
                  <span class="font-bold">Wins</span>
                  <span class="text-cyan-400 text-lg">${profileData.wins || 0}</span>
                </div>
                <div class="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border-l-4 border-pink-400">
                  <span class="font-bold">Losses</span>
                  <span class="text-pink-400 text-lg">${profileData.losses || 0}</span>
                </div>
                <div class="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border-l-4 border-purple-400">
                  <span class="font-bold">Win Rate</span>
                  <span class="text-purple-400 text-lg">${profileData.winRate || '0%'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Tabs -->
          <div>
            <div class="tabs-container">
              <div class="flex border-b border-pink-400/30 mb-6">
                <button class="tab-btn active" data-tab="profile-settings">Profile Settings</button>
                <button class="tab-btn" data-tab="friends">Friends</button>
                <button class="tab-btn" data-tab="match-history">Match History</button>
              </div>

              <div class="tab-content" id="match-history">
                <h2 class="text-2xl font-bold mb-4 text-cyan-300">Recent Matches</h2>
                <div class="space-y-4">
                  <!-- Match Items will be dynamically inserted here -->
                </div>
              </div>

              <div class="tab-content active" id="profile-settings">
                <h2 class="text-2xl font-bold mb-6 text-cyan-300">Profile Settings</h2>
                <form id="profile-form">
                  <input type="file" id="photo-upload" class="hidden" accept="image/*">
                  <div class="mb-6">
                    <label for="username" class="block text-pink-300 mb-2">Username</label>
                    <input type="text" id="username" name="username" class="w-full py-3 px-5 bg-gray-800/50 border-2 border-cyan-400/30 rounded-lg outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all" value="${profileData.username || ''}">
                  </div>
                  <div class="mb-6">
                    <label for="email" class="block text-pink-300 mb-2">Email</label>
                    <input type="email" id="email" name="email" class="w-full py-3 px-5 bg-gray-800/50 border-2 border-cyan-400/30 rounded-lg outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all" value="${profileData.email || ''}">
                  </div>
                  <div class="mb-6">
                    <label class="block text-pink-300 mb-2">Two-Factor Authentication</label>
                    <button type="button" class="btn-2fa w-full h-12 rounded-lg border-2 border-pink-400 cursor-pointer font-bold hover:bg-pink-400/20 hover:shadow-[0_0_20px_rgba(255,20,147,0.5)] transition-all">Enable 2FA</button>
                  </div>
                  <button type="submit" class="btn w-full h-12 rounded-lg border-2 border-cyan-400 cursor-pointer font-bold hover:bg-cyan-400/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all uppercase tracking-wider">Save Changes</button>
                </form>
              </div>

              <div class="tab-content" id="friends">
                <h2 class="text-2xl font-bold mb-4 text-cyan-300">Friends List</h2>
                <div class="space-y-3">
                  <!-- Friend Items will be dynamically inserted here -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Tab functionality
    const tabButtons = container.querySelectorAll('.tab-btn');
    const tabContents = container.querySelectorAll('.tab-content');

    const activeTab = getActiveTab();
    if (activeTab) {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      const button = container.querySelector(`[data-tab="${activeTab}"]`);
      const content = container.querySelector(`#${activeTab}`);

      if (button) button.classList.add('active');
      if (content) content.classList.add('active');
    }

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');

        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        tabContents.forEach(content => {
          if (content.id === tabId) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });
      });
    });

    // Handle form submission
    const profileForm = container.querySelector('#profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const updatedData = Object.fromEntries(formData.entries());
        
        try {
          const result = await updateUserProfile(user.id, updatedData);
          console.log('Profile updated:', result);
          // Optionally, re-fetch profile data to show updated info
          loadProfileData(); 
        } catch (error) {
          console.error('Failed to update profile:', error);
          // Show an error message to the user
        }
      });
    }

    // Handle photo upload
    const cameraButton = container.querySelector('#camera-button');
    const photoUploadInput = container.querySelector('#photo-upload') as HTMLInputElement;

    if (cameraButton && photoUploadInput) {
      cameraButton.addEventListener('click', () => {
        photoUploadInput.click();
      });

      photoUploadInput.addEventListener('change', async () => {
        const file = photoUploadInput.files?.[0];
        if (file) {
          try {
            await uploadProfilePicture(user.id, file);
            loadProfileData();
          } catch (error) {
            console.error('Failed to upload profile picture:', error);
            // Show an error message to the user
          }
        }
      });
    }

    // Fetch and render match history and friends list
    loadMatchHistory();
    loadFriendsList();
  };

  const renderLoading = () => {
    container.innerHTML = `<div class="text-center p-12">Loading profile...</div>`;
  };

  const renderError = (error: any) => {
    container.innerHTML = `<div class="text-center p-12 text-red-500">Error loading profile: ${error.message}</div>`;
  };

  const loadProfileData = async () => {
    renderLoading();
    try {
      const profileData = await fetchUserProfile("bob");
      render(profileData);
    } catch (error) {
      renderError(error);
    }
  };

  const loadMatchHistory = async () => {
    try {
      const matches = await fetchMatchHistory(user.id);
      renderMatchHistory(matches);
    } catch (error) {
      console.error('Failed to load match history:', error);
      const matchHistoryContainer = container.querySelector('#match-history .space-y-4');
      if (matchHistoryContainer) {
        matchHistoryContainer.innerHTML = `<p class="text-red-500">Could not load match history.</p>`;
      }
    }
  };

  const loadFriendsList = async () => {
    try {
      const friends = await fetchFriends(user.id);
      renderFriendsList(friends);
    } catch (error) {
      console.error('Failed to load friends list:', error);
      const friendsListContainer = container.querySelector('#friends .space-y-3');
      if (friendsListContainer) {
        friendsListContainer.innerHTML = `<p class="text-red-500">Could not load friends list.</p>`;
      }
    }
  };

  if (user) {
    loadProfileData();
  } else {
    renderError({ message: 'You must be logged in to view this page.' });
  }

  return container;
}
