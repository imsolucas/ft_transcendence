import { escapeHtml } from '../../utils/sanitize';
import { typography } from '../../styles/theme';
import { t } from '../../i18n';

export interface Friend {
  username: string;
  avatar: string;
  status: 'online' | 'offline';
}

export function createFriendsList(): string {
  return `
    <div id="friends" class="tab-content bg-black/40 backdrop-blur-md rounded-b-2xl p-6 sm:p-8 border-2 border-white/40 border-t-0">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 -mt-4 sm:-mt-6">
        <!-- Friend cards will be inserted here -->
      </div>
    </div>
  `;
}

export function renderFriendsList(container: HTMLElement, friends: Friend[]): void {
  setTimeout(() => {
    try {
      const friendsListContainer = container.querySelector('#friends > div');

      if (!friendsListContainer) {
        console.error('Friends list container not found');
        return;
      }

      if (friends.length === 0) {
        friendsListContainer.innerHTML = `
          <div class="col-span-full text-center py-8 sm:py-12">
            <i class="bx bx-user-plus text-4xl sm:text-6xl text-white/50 mb-3 sm:mb-4"></i>
            <p class="text-white/70 ${typography.body} text-sm sm:text-base">
              ${escapeHtml(String(t('profile.noFriends') || 'No friends yet'))}
            </p>
          </div>
        `;
        return;
      }

      const friendsHTML = friends.map(friend => {
        const statusColor = friend.status === 'online' ? 'bg-green-400' : 'bg-gray-500';
        const statusShadow = '';
        const statusText = friend.status === 'online'
          ? String(t('profile.online') || 'Online')
          : String(t('profile.offline') || 'Offline');

        return `
          <div class="bg-black/40 backdrop-blur-sm rounded-xl p-4 sm:p-6 border-2 border-white/40 transition-all">
            <div class="flex items-center gap-3 sm:gap-4">
              <div class="relative">
                <img
                  src="${escapeHtml(friend.avatar)}"
                  alt="${escapeHtml(friend.username)}"
                  class="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-white/50 object-cover"
                />
                <div class="absolute bottom-0 right-0 w-3 h-3 sm:w-4 sm:h-4 ${statusColor} ${statusShadow} rounded-full border-2 border-gray-900"></div>
              </div>
              <div class="flex-1">
                <div class="${typography.body} text-base sm:text-lg font-semibold text-white">
                  ${escapeHtml(friend.username)}
                </div>
                <div class="text-gray-400 ${typography.body} text-xs sm:text-sm">
                  ${escapeHtml(statusText)}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      friendsListContainer.innerHTML = friendsHTML;
    } catch (error) {
      console.error('Error rendering friends list:', error);
    }
  }, 0);
}
