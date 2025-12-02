
import { fetchUserProfile, updateUserProfile, fetchMatchHistory, fetchFriends, uploadProfilePicture, setup2FA } from '../utils/api';
import { getCurrentUser } from '../utils/auth-script';
import { getActiveTab } from '../router';
import { t } from '../i18n';
import { LanguageSelector } from './LanguageSelector';
import { updateNavbar } from './Navbar';

export function ProfileData() {
  const container = document.createElement('div');
  container.className = 'relative w-full max-w-4xl mx-auto min-h-[600px] md:min-h-[800px] bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-[0_0_50px_rgba(255,20,147,0.4)] overflow-visible border-2 border-pink-400/30 mb-8';

  let user: any = null;

  const renderMatchHistory = (matches: any[]) => {
    const matchHistoryContainer = container.querySelector('#match-history > div');
    if (!matchHistoryContainer) return;

    matchHistoryContainer.innerHTML = matches.map(match => `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-800/70 p-3 sm:p-4 rounded-lg hover:bg-gray-800 transition-all border-l-4 ${match.result === 'WIN' ? 'border-green-500' : 'border-red-500'} gap-3 sm:gap-0">
        <div class="flex items-center flex-1 min-w-0">
          <img src="${match.opponent.picture}" class="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-3 sm:mr-4 border-2 border-gray-600 flex-shrink-0">
          <div class="min-w-0 flex-1">
            <p class="font-bold text-sm sm:text-base truncate">vs. ${match.opponent.username}</p>
            <p class="text-xs sm:text-sm text-gray-400 truncate">${match.type}</p>
          </div>
        </div>
        <div class="text-center flex-shrink-0">
          <p class="text-base sm:text-lg font-bold ${match.result === 'WIN' ? 'text-green-500' : 'text-red-500'}">${match.result}</p>
          <p class="text-xs sm:text-sm">${match.score}</p>
        </div>
        <p class="text-xs sm:text-sm text-gray-500 flex-shrink-0">${match.timestamp}</p>
      </div>
    `).join('');
  };

  const renderFriendsList = (friends: any[]) => {
    const friendsListContainer = container.querySelector('#friends > div');
    if (!friendsListContainer) return;

    friendsListContainer.innerHTML = friends.map(friend => `
      <div class="flex items-center justify-between bg-gray-800/70 p-3 rounded-lg gap-3">
        <div class="flex items-center min-w-0 flex-1">
          <img src="${friend.picture}" class="w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-3 sm:mr-4 flex-shrink-0">
          <span class="font-bold text-sm sm:text-base truncate">${friend.username}</span>
        </div>
        <span class="text-xs sm:text-sm ${friend.status === 'Online' ? 'text-green-500' : (friend.status === 'In Game' ? 'text-yellow-500' : 'text-gray-500')} flex-shrink-0 whitespace-nowrap">${friend.status}</span>
      </div>
    `).join('');
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full max-w-sm`;
    
    switch (type) {
      case 'success':
        notification.className += ' bg-green-500 text-white';
        break;
      case 'error':
        notification.className += ' bg-red-500 text-white';
        break;
      case 'info':
        notification.className += ' bg-blue-500 text-white';
        break;
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
      notification.classList.add('translate-x-0');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('translate-x-0');
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  const render = (profileData: any) => {
    container.innerHTML = `
      <!-- Retro grid and glowing orbs -->
      <div class="absolute inset-0 opacity-10 pointer-events-none">
        <div class="grid-pattern"></div>
      </div>
      <div class="absolute top-8 right-8 w-10 h-10 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_20px_#00ffff]"></div>
      <div class="absolute bottom-8 left-8 w-8 h-8 rounded-full bg-pink-400 animate-pulse shadow-[0_0_15px_#ff1493] animation-delay-500"></div>

      <div class="relative z-10 p-4 sm:p-6 md:p-8 lg:p-12 overflow-visible">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          <!-- Left Column: User Info -->
          <div class="text-center flex flex-col items-center">
            <div class="relative mb-4 sm:mb-6">
              <img src="${profileData.picture || '/images/pong.png'}" alt="User Avatar" class="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-cyan-400 shadow-[0_0_30px_rgba(0,255,255,0.6)] object-cover">
              <button id="camera-button" class="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-pink-500 rounded-full flex items-center justify-center border-2 border-gray-900 hover:bg-pink-600 transition-all transform hover:scale-110">
                <i class="bx bxs-camera text-base sm:text-xl"></i>
              </button>
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] break-words px-2">${profileData.username || 'USER_NAME'}</h1>
            <p class="text-cyan-300 text-sm sm:text-base mt-1">${t('profile.level')} ${profileData.level || 42}</p>
            
            <div class="w-full mt-6 md:mt-8">
              <h3 class="text-lg sm:text-xl font-semibold text-pink-300 mb-4 tracking-wider uppercase text-center sm:text-left">${t('profile.stats')}</h3>
              <div class="space-y-3 text-left">
                <div class="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border-l-4 border-cyan-400 min-h-[3rem]">
                  <span class="font-bold text-sm sm:text-base break-words pr-2">${t('profile.wins')}</span>
                  <span class="text-cyan-400 text-lg sm:text-xl font-semibold flex-shrink-0">${profileData.wins || 0}</span>
                </div>
                <div class="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border-l-4 border-pink-400 min-h-[3rem]">
                  <span class="font-bold text-sm sm:text-base break-words pr-2">${t('profile.losses')}</span>
                  <span class="text-pink-400 text-lg sm:text-xl font-semibold flex-shrink-0">${profileData.losses || 0}</span>
                </div>
                <div class="flex justify-between items-center bg-gray-800/50 p-3 rounded-lg border-l-4 border-purple-400 min-h-[3rem]">
                  <span class="font-bold text-sm sm:text-base break-words pr-2">${t('profile.winRate')}</span>
                  <span class="text-purple-400 text-lg sm:text-xl font-semibold flex-shrink-0">${profileData.winRate || '0%'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Tabs -->
          <div class="w-full">
            <div class="tabs-container">
              <div class="flex flex-wrap border-b border-pink-400/30 mb-6 gap-2 sm:gap-0">
                <button class="tab-btn active text-xs sm:text-sm md:text-base px-2 sm:px-4 md:px-6 py-2 sm:py-3" data-tab="profile-settings">${t('profile.profileSettings')}</button>
                <button class="tab-btn text-xs sm:text-sm md:text-base px-2 sm:px-4 md:px-6 py-2 sm:py-3" data-tab="friends">${t('profile.friends')}</button>
                <button class="tab-btn text-xs sm:text-sm md:text-base px-2 sm:px-4 md:px-6 py-2 sm:py-3" data-tab="match-history">${t('profile.matchHistory')}</button>
              </div>

              <div class="tab-content" id="match-history">
                <h2 class="text-xl sm:text-2xl font-bold mb-4 text-cyan-300 break-words">${t('profile.recentMatches')}</h2>
                <div class="space-y-3 sm:space-y-4 overflow-x-auto">
                  <!-- Match Items will be dynamically inserted here -->
                </div>
              </div>

              <div class="tab-content active" id="profile-settings">
                <h2 class="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-cyan-300 break-words">${t('profile.profileSettings')}</h2>
                <form id="profile-form">
                  <input type="file" id="photo-upload" class="hidden" accept="image/*">
                  <div class="mb-4 sm:mb-6">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                      <label for="username" class="block text-pink-300 text-sm sm:text-base">${t('profile.username')}</label>
                      <button type="button" id="edit-username-btn" class="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm transition-colors self-start sm:self-auto">
                        <i class="bx bxs-edit-alt"></i> ${t('profile.edit') || 'Edit'}
                      </button>
                    </div>
                    <input type="text" id="username" name="username" class="w-full py-2 sm:py-3 px-3 sm:px-5 bg-gray-800/50 border-2 border-cyan-400/30 rounded-lg outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base" value="${profileData.username || ''}" disabled>
                  </div>
                  <div class="mb-4 sm:mb-6">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                      <label for="email" class="block text-pink-300 text-sm sm:text-base">${t('profile.email')}</label>
                      <button type="button" id="edit-email-btn" class="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm transition-colors self-start sm:self-auto">
                        <i class="bx bxs-edit-alt"></i> ${t('profile.edit') || 'Edit'}
                      </button>
                    </div>
                    <input type="email" id="email" name="email" class="w-full py-2 sm:py-3 px-3 sm:px-5 bg-gray-800/50 border-2 border-cyan-400/30 rounded-lg outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base" value="${profileData.email || ''}" disabled>
                  </div>
                  <div class="mb-4 sm:mb-6">
                    <label class="block text-pink-300 mb-2 text-sm sm:text-base">${t('profile.twoFactorAuth')}</label>
                    <button type="button" class="btn-2fa w-full h-10 sm:h-12 rounded-lg border-2 border-pink-400 font-bold transition-all text-sm sm:text-base ${profileData.is2FAEnabled ? 'opacity-50 cursor-not-allowed bg-gray-800/30' : 'cursor-pointer hover:bg-pink-400/20 hover:shadow-[0_0_20px_rgba(255,20,147,0.5)]'}" ${profileData.is2FAEnabled ? 'disabled="disabled"' : ''}>${profileData.is2FAEnabled ? String(t('profile.twoFAEnabled') || '2FA Has Been Enabled') : String(t('profile.enable2FA') || 'Enable 2FA')}</button>
                  </div>
                  <div class="mb-4 sm:mb-6">
                    <label class="block text-pink-300 mb-2 text-sm sm:text-base">Language</label>
                    <div id="language-selector-container" class="w-full"></div>
                  </div>
                  <button type="submit" class="btn w-full h-10 sm:h-12 rounded-lg border-2 border-cyan-400 cursor-pointer font-bold hover:bg-cyan-400/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all uppercase tracking-wider text-sm sm:text-base">${t('profile.saveChanges')}</button>
                </form>
              </div>

              <div class="tab-content" id="friends">
                <h2 class="text-xl sm:text-2xl font-bold mb-4 text-cyan-300 break-words">${t('profile.friendsList')}</h2>
                <div class="space-y-2 sm:space-y-3 overflow-x-auto">
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
        const updatedData: any = {};
        
        // Only include fields that are enabled and have values
        const usernameInput = container.querySelector('#username') as HTMLInputElement;
        const emailInput = container.querySelector('#email') as HTMLInputElement;
        
        if (usernameInput && !usernameInput.disabled && usernameInput.value.trim()) {
          updatedData.username = usernameInput.value.trim();
        }
        if (emailInput && !emailInput.disabled && emailInput.value.trim()) {
          updatedData.email = emailInput.value.trim();
        }
        
        // Don't send if no valid fields
        if (Object.keys(updatedData).length === 0) {
          showNotification('No changes to save', 'info');
          return;
        }
        
        // Get submit button and disable it
        const submitBtn = profileForm.querySelector('button[type="submit"]') as HTMLButtonElement;
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving...';
        }
        
        try {
          const result = await updateUserProfile(updatedData);
          showNotification(String(t('profile.profileUpdated') || 'Profile updated successfully!'), 'success');
          
          // Update localStorage user data
          if (result) {
            const currentUser = await getCurrentUser();
            if (currentUser) {
              const updatedUser = {
                ...currentUser,
                username: String(result.username || currentUser.username),
                email: String(result.email || currentUser.email),
                picture: String(result.picture || currentUser.picture),
              };
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
          }
          
          // Re-fetch profile data to show updated info
          await loadProfileData();
        } catch (error: any) {
          console.error('Failed to update profile:', error);
          const errorMsg = error.message || String(t('profile.updateFailed') || 'Failed to update profile. Please try again.');
          showNotification(errorMsg, 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText || String(t('profile.saveChanges'));
          }
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
          // Validate file size (max 5MB - will be compressed automatically)
          if (file.size > 5 * 1024 * 1024) {
            alert(t('profile.pictureTooLarge') || 'Image is too large. Maximum size is 5MB. The image will be automatically compressed.');
            return;
          }
          
          // Validate file type
          if (!file.type.startsWith('image/')) {
            alert(t('profile.invalidImageType') || 'Please select a valid image file.');
            return;
          }

          // Show loading state
          const originalButtonText = cameraButton.innerHTML;
          cameraButton.innerHTML = '<i class="bx bx-loader-alt animate-spin text-xl"></i>';
          (cameraButton as HTMLButtonElement).disabled = true;

          try {
            const result = await uploadProfilePicture(file);
            const successMsg = String(t('profile.pictureUploaded') || 'Profile picture updated successfully!');
            showNotification(successMsg, 'success');
            
            // Update localStorage with new picture
            const currentUser = await getCurrentUser();
            if (currentUser && result.picture) {
              const updatedUser = {
                ...currentUser,
                picture: result.picture,
                avatar: result.picture,
              };
              localStorage.setItem('user', JSON.stringify(updatedUser));
            }
            
            // Update navbar to show new profile picture
            await updateNavbar();
            
            // Reload profile data
            loadProfileData();
          } catch (error: any) {
            console.error('Failed to upload profile picture:', error);
            const errorMsg = error.message || String(t('profile.pictureUploadFailed') || 'Failed to upload profile picture. Please try again.');
            showNotification(errorMsg, 'error');
          } finally {
            cameraButton.innerHTML = originalButtonText;
            (cameraButton as HTMLButtonElement).disabled = false;
            photoUploadInput.value = ''; // Reset input
          }
        }
      });
    }

    // Add language selector to profile settings
    const languageSelectorContainer = container.querySelector('#language-selector-container');
    if (languageSelectorContainer) {
      const languageSelector = LanguageSelector();
      // Make the language selector button full width to match other form inputs
      const selectorBtn = languageSelector.querySelector('#language-selector-btn') as HTMLElement;
      if (selectorBtn) {
        // Update styling to match form inputs while preserving layout
        selectorBtn.classList.remove('p-2', 'border', 'border-white/20', 'hover:bg-white/10');
        selectorBtn.classList.add('w-full', 'py-2', 'sm:py-3', 'px-3', 'sm:px-5', 'bg-gray-800/50', 'border-2', 'border-cyan-400/30', 'rounded-lg', 'outline-none', 'focus:border-cyan-400', 'focus:shadow-[0_0_15px_rgba(0,255,255,0.3)]', 'transition-all', 'text-sm', 'sm:text-base', 'text-white', 'hover:bg-gray-800/70', 'justify-between');
        // Ensure the button maintains flex layout for icon and text
        if (!selectorBtn.classList.contains('flex')) {
          selectorBtn.classList.add('flex');
        }
      }
      // Adjust dropdown to align left instead of right for profile context
      const dropdown = languageSelector.querySelector('#language-dropdown') as HTMLElement;
      if (dropdown) {
        dropdown.classList.remove('right-0');
        dropdown.classList.add('left-0', 'w-full');
      }
      languageSelectorContainer.appendChild(languageSelector);
    }

    // Handle edit buttons for username and email
    const editUsernameBtn = container.querySelector('#edit-username-btn');
    const editEmailBtn = container.querySelector('#edit-email-btn');
    const usernameInput = container.querySelector('#username') as HTMLInputElement;
    const emailInput = container.querySelector('#email') as HTMLInputElement;

    editUsernameBtn?.addEventListener('click', () => {
      if (usernameInput) {
        usernameInput.disabled = !usernameInput.disabled;
        usernameInput.focus();
      }
    });

    editEmailBtn?.addEventListener('click', () => {
      if (emailInput) {
        emailInput.disabled = !emailInput.disabled;
        emailInput.focus();
      }
    });

    // Handle 2FA button
    const twoFABtn = container.querySelector('.btn-2fa') as HTMLButtonElement;
    if (twoFABtn) {
      if (profileData.is2FAEnabled) {
        // Ensure button is disabled and styled correctly if 2FA is already enabled
        twoFABtn.disabled = true;
        twoFABtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-800/30');
        twoFABtn.classList.remove('cursor-pointer', 'hover:bg-pink-400/20', 'hover:shadow-[0_0_20px_rgba(255,20,147,0.5)]');
        // Remove any existing click handlers
        twoFABtn.onclick = null;
      } else {
        // Only attach click handler if 2FA is not enabled
        twoFABtn.disabled = false;
        twoFABtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          show2FASetupModal();
        });
      }
    }

    // Fetch and render match history and friends list
    loadMatchHistory();
    loadFriendsList();
  };

  // Show 2FA Setup Modal
  const show2FASetupModal = async () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm';
    modal.id = '2fa-setup-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'relative w-[850px] max-w-[90vw] bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-sm rounded-[30px] shadow-[0_0_50px_rgba(255,20,147,0.4)] border-2 border-pink-400/30 p-8 md:p-12 font-poppins';
    
    // Retro grid overlay
    const gridOverlay = document.createElement('div');
    gridOverlay.className = 'absolute inset-0 opacity-10 pointer-events-none rounded-[30px]';
    const gridPattern = document.createElement('div');
    gridPattern.className = 'grid-pattern';
    gridOverlay.appendChild(gridPattern);
    modalContent.appendChild(gridOverlay);
    
    // Glowing orbs
    const orb1 = document.createElement('div');
    orb1.className = 'absolute top-4 right-4 w-8 h-8 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_20px_#00ffff]';
    modalContent.appendChild(orb1);
    
    const orb2 = document.createElement('div');
    orb2.className = 'absolute bottom-4 left-4 w-6 h-6 rounded-full bg-pink-400 animate-pulse shadow-[0_0_15px_#ff1493] animation-delay-500';
    modalContent.appendChild(orb2);
    
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'relative z-10 text-center';
    
    const title = document.createElement('h2');
    title.className = 'text-3xl md:text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]';
    title.textContent = String(t('twoFA.setupTitle') || 'SETUP TWO-FACTOR AUTHENTICATION');
    contentWrapper.appendChild(title);
    
    const loadingDiv = document.createElement('div');
    loadingDiv.id = '2fa-setup-loading';
    loadingDiv.className = 'mb-6';
    const loadingText = document.createElement('p');
    loadingText.className = 'text-pink-300 mb-4';
    loadingText.textContent = String(t('twoFA.settingUp') || 'Setting up 2FA...');
    loadingDiv.appendChild(loadingText);
    const spinner = document.createElement('div');
    spinner.className = 'flex justify-center';
    const spinnerCircle = document.createElement('div');
    spinnerCircle.className = 'w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin';
    spinner.appendChild(spinnerCircle);
    loadingDiv.appendChild(spinner);
    contentWrapper.appendChild(loadingDiv);
    
    const contentDiv = document.createElement('div');
    contentDiv.id = '2fa-setup-content';
    contentDiv.className = 'hidden';
    
    const scanText = document.createElement('p');
    scanText.className = 'text-pink-300 mb-4 text-sm md:text-base';
    scanText.textContent = String(t('twoFA.scanQR') || 'Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)');
    contentDiv.appendChild(scanText);
    
    const qrContainer = document.createElement('div');
    qrContainer.className = 'mb-6 flex justify-center';
    const qrCodeImg = document.createElement('img');
    qrCodeImg.id = '2fa-qr-code';
    qrCodeImg.alt = 'QR Code';
    qrCodeImg.className = 'w-64 h-64 bg-white p-4 rounded-lg border-2 border-cyan-400/50 shadow-[0_0_20px_rgba(0,255,255,0.3)]';
    qrContainer.appendChild(qrCodeImg);
    contentDiv.appendChild(qrContainer);
    
    const manualEntryContainer = document.createElement('div');
    manualEntryContainer.className = 'mb-6';
    const manualEntryLabel = document.createElement('p');
    manualEntryLabel.className = 'text-cyan-300 mb-2 text-sm font-semibold';
    manualEntryLabel.textContent = String(t('twoFA.manualEntry') || 'Or enter this code manually:');
    manualEntryContainer.appendChild(manualEntryLabel);
    const secretContainer = document.createElement('div');
    secretContainer.className = 'bg-gray-800/50 border-2 border-cyan-400/30 rounded-lg p-3';
    const secretCode = document.createElement('code');
    secretCode.id = '2fa-secret';
    secretCode.className = 'text-cyan-400 font-mono text-sm md:text-base break-all';
    secretContainer.appendChild(secretCode);
    manualEntryContainer.appendChild(secretContainer);
    contentDiv.appendChild(manualEntryContainer);
    
    const setupCompleteText = document.createElement('p');
    setupCompleteText.className = 'text-pink-300 mb-6 text-xs md:text-sm';
    setupCompleteText.textContent = String(t('twoFA.setupComplete') || 'Once you\'ve scanned the QR code, 2FA will be enabled for your account.');
    contentDiv.appendChild(setupCompleteText);
    
    const closeBtn = document.createElement('button');
    closeBtn.id = '2fa-setup-close-btn';
    closeBtn.className = 'btn w-48 h-12 rounded-lg border-2 border-pink-400 cursor-pointer text-base text-white font-bold hover:bg-pink-400/20 hover:shadow-[0_0_20px_rgba(255,20,147,0.5)] transition-all font-poppins bg-gradient-to-r from-pink-500/20 to-cyan-500/20 backdrop-blur-sm uppercase tracking-wider';
    closeBtn.textContent = String(t('common.close') || 'CLOSE');
    contentDiv.appendChild(closeBtn);
    
    contentWrapper.appendChild(contentDiv);
    
    const errorDiv = document.createElement('div');
    errorDiv.id = '2fa-setup-error';
    errorDiv.className = 'hidden mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm font-poppins';
    const errorText = document.createElement('span');
    errorText.className = 'error-text';
    errorDiv.appendChild(errorText);
    contentWrapper.appendChild(errorDiv);
    
    modalContent.appendChild(contentWrapper);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Track if 2FA was successfully set up (to update button on close)
    let shouldUpdateButton = false;
    
    // Single close button handler to prevent duplicate listeners
    const handleClose = () => {
      if (shouldUpdateButton) {
        // Update button state if 2FA was successfully set up
        const twoFABtn = container.querySelector('.btn-2fa') as HTMLButtonElement;
        if (twoFABtn) {
          twoFABtn.textContent = String(t('profile.twoFAEnabled') || '2FA Has Been Enabled');
          twoFABtn.disabled = true;
          twoFABtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-800/30');
          twoFABtn.classList.remove('cursor-pointer', 'hover:bg-pink-400/20', 'hover:shadow-[0_0_20px_rgba(255,20,147,0.5)]');
          twoFABtn.onclick = null;
        }
      }
      
      // Remove modal
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
      
      // Reload profile to update button state
      loadProfileData();
    };
    
    // Attach close handler once
    closeBtn.addEventListener('click', handleClose);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        handleClose();
      }
    });
    
    // Setup 2FA
    try {
      const result = await setup2FA();
      
      // Hide loading, show content
      loadingDiv.classList.add('hidden');
      contentDiv.classList.remove('hidden');
      
      // Set QR code and secret (we already have references)
      if (result.qrCode) {
        qrCodeImg.src = result.qrCode;
      }
      
      if (result.secret) {
        secretCode.textContent = result.secret;
      }
      
      showNotification(String(t('twoFA.setupSuccess') || '2FA setup successful!'), 'success');
      
      // Mark that button should be updated on close
      shouldUpdateButton = true;
    } catch (error: any) {
      console.error('2FA setup error:', error);
      loadingDiv.classList.add('hidden');
      
      // Check if 2FA is already enabled
      if (error.message && error.message.includes('already enabled')) {
        errorText.textContent = String(t('twoFA.alreadyEnabled') || '2FA is already enabled for your account.');
        // Update button state immediately
        const twoFABtn = container.querySelector('.btn-2fa') as HTMLButtonElement;
        if (twoFABtn) {
          twoFABtn.textContent = String(t('profile.twoFAEnabled') || '2FA Has Been Enabled');
          twoFABtn.disabled = true;
          twoFABtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-800/30');
          twoFABtn.classList.remove('cursor-pointer', 'hover:bg-pink-400/20', 'hover:shadow-[0_0_20px_rgba(255,20,147,0.5)]');
          twoFABtn.onclick = null;
        }
        // Mark that button should be updated on close (already updated, but reload will confirm)
        shouldUpdateButton = true;
      } else {
        errorText.textContent = error.message || String(t('twoFA.setupFailed') || 'Failed to setup 2FA. Please try again.');
      }
      
      errorDiv.classList.remove('hidden');
    }
  };

  const renderLoading = () => {
    container.innerHTML = `<div class="text-center p-12">${t('profile.loadingProfile')}</div>`;
  };

  const renderError = (error: any) => {
    container.innerHTML = `<div class="text-center p-12 text-red-500">${t('profile.errorLoading')}: ${error.message}</div>`;
  };

  const loadProfileData = async () => {
    renderLoading();
    try {
      user = await getCurrentUser();
      if (!user) {
        renderError({ message: t('profile.mustBeLoggedIn') });
        return;
      }
      const profileData = await fetchUserProfile();
      render(profileData);
    } catch (error) {
      renderError(error);
    }
  };

  const loadMatchHistory = async () => {
    try {
      const matches = await fetchMatchHistory();
      renderMatchHistory(matches);
    } catch (error) {
      console.error('Failed to load match history:', error);
      const matchHistoryContainer = container.querySelector('#match-history > div');
      if (matchHistoryContainer) {
        matchHistoryContainer.innerHTML = `<p class="text-red-500 text-sm sm:text-base">${t('profile.couldNotLoadMatchHistory')}</p>`;
      }
    }
  };

  const loadFriendsList = async () => {
    try {
      const friends = await fetchFriends();
      renderFriendsList(friends);
    } catch (error) {
      console.error('Failed to load friends list:', error);
      const friendsListContainer = container.querySelector('#friends > div');
      if (friendsListContainer) {
        friendsListContainer.innerHTML = `<p class="text-red-500 text-sm sm:text-base">${t('profile.couldNotLoadFriends')}</p>`;
      }
    }
  };

  loadProfileData();

  return container;
}
