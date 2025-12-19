import { fetchUserProfile, getUserProfileByUsername, updateUserProfile, fetchMatchHistory, fetchFriends, uploadProfilePicture, setup2FA, calculateUserStats } from '../../utils/api';
import { getCurrentUser } from '../../utils/auth-script';
import { t } from '../../i18n';
import { LanguageSelector } from '../shared/LanguageSelector';
import { updateNavbar } from '../layout/Navbar';
import { getActiveTab } from '../../router';
import { createProfileHeader, setupProfileHeader, type ProfileHeaderData } from './ProfileHeader';
import { createProfileStats, type ProfileStatsData } from './ProfileStats';
import { createProfileTabs, setupProfileTabs } from './ProfileTabs';
import { createProfileSettings, setupProfileSettings, type ProfileSettingsData, type ProfileSettingsHandlers } from './ProfileSettings';
import { createMatchHistory, renderMatchHistory, type Match } from './MatchHistory';
import { createFriendsList, renderFriendsList, type Friend } from './FriendsList';
import { createProfileStyles } from './ProfileStyles';

export function ProfileData(viewUsername?: string) {
  const container = document.createElement('div');
  container.className = 'relative w-full max-w-6xl mx-auto';
  const isViewingOtherUser = !!viewUsername;

  let user: any = null;

  // Notification helper
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-24 right-4 z-[200] p-4 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } text-white font-semibold transition-all transform translate-x-0`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  // Photo upload handler
  const handlePhotoUpload = async (file: File): Promise<void> => {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('profile.pictureTooLarge') || 'Image is too large. Maximum size is 5MB.');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('profile.invalidImageType') || 'Please select a valid image file.');
      return;
    }

    const cameraButton = container.querySelector('#camera-button') as HTMLButtonElement;
    const originalButtonHTML = cameraButton?.innerHTML || '';

    if (cameraButton) {
      cameraButton.innerHTML = '<i class="bx bx-loader-alt animate-spin text-xl"></i>';
      cameraButton.disabled = true;
    }

    try {
      const result = await uploadProfilePicture(file);
      showNotification(String(t('profile.pictureUploaded') || 'Profile picture updated successfully!'), 'success');

      // Update localStorage with new picture
      const currentUser = await getCurrentUser();
      if (currentUser && result.picture) {
        // User data is fetched from API when needed, not stored in localStorage
      }

      // Update navbar and reload profile
      await updateNavbar();
      loadProfileData();
    } catch (error: any) {
      console.error('Failed to upload profile picture:', error);
      const errorMsg = error.message || String(t('profile.pictureUploadFailed') || 'Failed to upload profile picture.');
      showNotification(errorMsg, 'error');
    } finally {
      if (cameraButton) {
        cameraButton.innerHTML = originalButtonHTML;
        cameraButton.disabled = false;
      }
    }
  };

  // Profile update handler
  const handleProfileUpdate = async (updatedData: { username?: string; email?: string }): Promise<void> => {
    if (Object.keys(updatedData).length === 0) {
      showNotification(String(t('profile.noChanges') || 'No changes to save'), 'info');
      return;
    }

    try {
      const result = await updateUserProfile(updatedData);
      showNotification(String(t('profile.profileUpdated') || 'Profile updated successfully!'), 'success');

      // User data is fetched from API when needed, not stored in localStorage

      // Reload profile to show updated info
      await loadProfileData();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const errorMsg = error.message || String(t('profile.updateFailed') || 'Failed to update profile.');
      showNotification(errorMsg, 'error');
      throw error;
    }
  };

  const render = (profileData: any) => {
    // Prepare data for modular components
    const headerData: ProfileHeaderData = {
      username: profileData.username || 'USER_NAME',
      level: profileData.level || 42,
      avatar: profileData.picture || '/images/pong.png',
    };

    const statsData: ProfileStatsData = {
      wins: profileData.wins || 0,
      losses: profileData.losses || 0,
      winRate: parseFloat(profileData.winRate) || 0,
    };

    const settingsData: ProfileSettingsData = {
      username: profileData.username || '',
      email: profileData.email || '',
      is2FAEnabled: profileData.is2FAEnabled || false,
    };

    container.innerHTML = `
      ${createProfileStyles()}

      <!-- Content -->
      <div class="relative z-10">
        ${createProfileHeader(headerData)}
        ${createProfileStats(statsData)}
        ${createProfileTabs()}        <!-- Tab Contents -->
        ${createProfileSettings(settingsData)}
        ${createMatchHistory()}
        ${createFriendsList()}
      </div>
    `;

    // Setup modular components
    // Only enable photo upload and settings when viewing own profile
    if (!isViewingOtherUser) {
    setupProfileHeader(container, handlePhotoUpload);
    // Get active tab from router or default to 'profile-settings'
    const activeTab = getActiveTab() || 'profile-settings';
    setupProfileTabs(container, activeTab);

    const settingsHandlers: ProfileSettingsHandlers = {
      onFormSubmit: handleProfileUpdate,
      on2FASetup: show2FASetupModal,
    };
    setupProfileSettings(container, settingsHandlers);
    } else {
      // When viewing another user, only show header (no photo upload) and default to match history tab
      setupProfileHeader(container, () => Promise.resolve()); // Empty handler for viewing other users
      setupProfileTabs(container, 'match-history');
      // Hide settings tab when viewing another user's profile
      const settingsTab = container.querySelector('[data-tab="profile-settings"]');
      if (settingsTab) {
        (settingsTab as HTMLElement).style.display = 'none';
      }
    }

    // Add language selector to profile settings
    setTimeout(() => {
      const languageSelectorContainer = container.querySelector('#language-selector-container');
      if (languageSelectorContainer) {
        const languageSelector = LanguageSelector();
        const selectorBtn = languageSelector.querySelector('#language-selector-btn') as HTMLElement;
        if (selectorBtn) {
          selectorBtn.classList.remove('p-2', 'border', 'border-white/20', 'hover:bg-white/10');
          selectorBtn.classList.add('w-full', 'py-2', 'sm:py-3', 'px-3', 'sm:px-5', 'bg-gray-800/50', 'border-2', 'border-cyan-400/30', 'rounded-lg', 'outline-none', 'focus:border-cyan-400', 'focus:shadow-[0_0_15px_rgba(0,255,255,0.3)]', 'transition-all', 'text-sm', 'sm:text-base', 'text-white', 'hover:bg-gray-800/70', 'justify-between');
          if (!selectorBtn.classList.contains('flex')) {
            selectorBtn.classList.add('flex');
          }
        }
        const dropdown = languageSelector.querySelector('#language-dropdown') as HTMLElement;
        if (dropdown) {
          dropdown.classList.remove('right-0');
          dropdown.classList.add('left-0', 'w-full');
        }
        languageSelectorContainer.appendChild(languageSelector);
      }
    }, 0);

    // Load match history and friends list
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
      // Fetch profile data - use getUserProfileByUsername if viewing another user's profile
      let profileData: any;
      if (viewUsername) {
        profileData = await getUserProfileByUsername(viewUsername);
        // Convert to expected format
        profileData = {
          id: profileData.id,
          username: profileData.username,
          email: profileData.email,
          picture: profileData.avatar,
          level: 1, // Will be calculated from stats if available
          is2FAEnabled: profileData.is2FAEnabled || false,
        };
      } else {
        profileData = await fetchUserProfile();
      }
      
      if (!profileData || !profileData.id) {
        renderError({ message: viewUsername ? (t('profile.userNotFound') || 'User not found') : (t('profile.mustBeLoggedIn') || 'You must be logged in to view your profile') });
        return;
      }
      
      // Fetch real stats from match history
      try {
        const stats = await calculateUserStats();
        // Merge stats with profile data
        const profileWithStats = {
          ...profileData,
          wins: stats.wins,
          losses: stats.losses,
          winRate: stats.winRate,
          level: stats.level,
        };
        user = profileWithStats; // Store for later use
        render(profileWithStats);
      } catch (statsError) {
        console.error('Error loading stats, using defaults:', statsError);
        // Fallback to profile data without stats (will show 0s)
        const profileWithDefaults = {
          ...profileData,
          wins: 0,
          losses: 0,
          winRate: '0%',
          level: profileData.level || 1,
        };
        user = profileWithDefaults;
        render(profileWithDefaults);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      renderError(error);
    }
  };

  const loadMatchHistory = async () => {
    try {
      const rawMatches = await fetchMatchHistory();
      // Transform API data to Match format
      const matches: Match[] = rawMatches.map((match: any) => ({
        opponent: match.opponent?.username || 'Unknown',
        result: match.result === 'WIN' ? 'win' : 'loss',
        score: match.score || '0-0',
        date: match.timestamp || new Date().toLocaleDateString(),
      }));
      renderMatchHistory(container, matches);
      
      // Update stats based on match history
      let wins = 0;
      let losses = 0;
      matches.forEach((match) => {
        if (match.result === 'win') wins++;
        else if (match.result === 'loss') losses++;
      });
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
      
      // Update stats display
      const winsElement = container.querySelector('#profile-wins');
      const lossesElement = container.querySelector('#profile-losses');
      const winRateElement = container.querySelector('#profile-winrate');
      if (winsElement) winsElement.textContent = wins.toString();
      if (lossesElement) lossesElement.textContent = losses.toString();
      if (winRateElement) winRateElement.textContent = `${winRate}%`;
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
      const rawFriends = await fetchFriends();
      // Transform API data to Friend format
      const friends: Friend[] = rawFriends.map((friend: any) => ({
        username: friend.username || 'Unknown',
        avatar: friend.picture || '/images/pong.png',
        status: friend.status === 'Online' ? 'online' : 'offline',
      }));
      renderFriendsList(container, friends);
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
