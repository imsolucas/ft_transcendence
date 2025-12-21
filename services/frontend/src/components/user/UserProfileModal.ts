// components/user/UserProfileModal.ts

import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { navigate } from '../../router';
import { getUserProfileByUsername } from '../../utils/api';
import { t } from '../../i18n';

interface UserProfileData {
  id: number;
  username: string;
  email?: string;
  avatar?: string;
  status?: 'ONLINE' | 'OFFLINE' | 'INGAME';
  is2FAEnabled?: boolean;
}

/**
 * Shows a user profile modal with option to view full profile
 */
export async function showUserProfileModal(username: string): Promise<void> {
  try {
    // Fetch full user profile data
    const userData = await getUserProfileByUsername(username);
    renderUserProfileModal(userData);
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    // Show modal with basic info if API call fails
    renderUserProfileModal({
      username,
      id: 0,
      avatar: '/images/pong.png',
      status: 'OFFLINE',
    }, error.message || 'Failed to load user profile');
  }
}

/**
 * Renders the user profile modal
 */
function renderUserProfileModal(
  userData: UserProfileData,
  errorMessage?: string
): void {
  const modalContent = document.createElement('div');
  modalContent.className = 'space-y-6';
  
  // Create modal first so we can reference it in the button
  const modalElement = Modal({
    title: String(t('user.profile') || 'User Profile'),
    content: modalContent,
    size: 'md',
    showCloseButton: true,
  });

  // User header with avatar and basic info
  const header = document.createElement('div');
  header.className = 'flex flex-col items-center space-y-4';

  // Avatar
  const avatarContainer = document.createElement('div');
  const avatar = Avatar({
    src: userData.avatar || '/images/pong.png',
    alt: userData.username,
    fallback: userData.username[0]?.toUpperCase() || 'U',
    size: 'xl',
    status: userData.status?.toLowerCase() as 'online' | 'offline' | 'ingame' | undefined,
  });
  avatarContainer.appendChild(avatar);
  header.appendChild(avatarContainer);

  // Username
  const usernameEl = document.createElement('h3');
  usernameEl.className = 'text-2xl font-bold text-white';
  usernameEl.textContent = userData.username;
  header.appendChild(usernameEl);

  // Status badge
  if (userData.status) {
    const statusEl = document.createElement('div');
    const statusColors = {
      ONLINE: 'bg-green-500',
      OFFLINE: 'bg-gray-500',
      INGAME: 'bg-yellow-500',
    };
    const statusLabels = {
      ONLINE: String(t('user.status.online') || 'Online'),
      OFFLINE: String(t('user.status.offline') || 'Offline'),
      INGAME: String(t('user.status.inGame') || 'In Game'),
    };
    statusEl.className = `px-3 py-1 rounded-full text-sm font-semibold text-white ${statusColors[userData.status]}`;
    statusEl.textContent = statusLabels[userData.status];
    header.appendChild(statusEl);
  }

  modalContent.appendChild(header);

  // User details section
  const details = document.createElement('div');
  details.className = 'space-y-3';

  // Email (if available and not private)
  if (userData.email && !errorMessage) {
    const emailRow = document.createElement('div');
    emailRow.className = 'flex items-center space-x-3 text-gray-300';
    const emailLabel = document.createElement('span');
    emailLabel.className = 'font-semibold text-gray-400';
    emailLabel.textContent = String(t('user.email') || 'Email:');
    const emailValue = document.createElement('span');
    emailValue.textContent = userData.email;
    emailRow.appendChild(emailLabel);
    emailRow.appendChild(emailValue);
    details.appendChild(emailRow);
  }

  // 2FA status (if available)
  if (userData.is2FAEnabled !== undefined && !errorMessage) {
    const twoFARow = document.createElement('div');
    twoFARow.className = 'flex items-center space-x-3 text-gray-300';
    const twoFALabel = document.createElement('span');
    twoFALabel.className = 'font-semibold text-gray-400';
    twoFALabel.textContent = String(t('user.twoFA.label') || '2FA:');
    const twoFAValue = document.createElement('span');
    twoFAValue.className = userData.is2FAEnabled ? 'text-green-400' : 'text-gray-500';
    twoFAValue.textContent = userData.is2FAEnabled
      ? String(t('user.twoFA.enabled') || 'Enabled')
      : String(t('user.twoFA.disabled') || 'Disabled');
    twoFARow.appendChild(twoFALabel);
    twoFARow.appendChild(twoFAValue);
    details.appendChild(twoFARow);
  }

  // Error message if any
  if (errorMessage) {
    const errorEl = document.createElement('div');
    errorEl.className = 'p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm';
    errorEl.textContent = errorMessage;
    details.appendChild(errorEl);
  }

  modalContent.appendChild(details);

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'flex flex-col space-y-3 pt-4';

  // View Full Profile button - closes modal and navigates
  const viewFullButton = Button({
    text: String(t('user.viewFullProfile') || 'View Full Profile'),
    variant: 'default',
    size: 'default',
    className: 'w-full',
    onClick: () => {
      // Close modal using Alpine.js if available
      if (window.Alpine && modalElement.__x) {
        modalElement.__x.$data.open = false;
        // Wait for transition animation before removing
        setTimeout(() => {
          modalElement.remove();
          // Navigate after modal is removed
          navigate('profile', `username=${encodeURIComponent(userData.username)}`);
        }, 200);
      } else {
        // Fallback: remove directly
        modalElement.remove();
        // Navigate immediately
        navigate('profile', `username=${encodeURIComponent(userData.username)}`);
      }
    },
  });
  actions.appendChild(viewFullButton);

  modalContent.appendChild(actions);

  // Append modal to body to show it
  document.body.appendChild(modalElement);
}

