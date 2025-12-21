import { sendFriendRequest, getFriendRequests, updateFriendRequest } from '../../utils/api';
import { t } from '../../i18n';

export function AddFriend() {
  const container = document.createElement('div');
  container.className = 'space-y-4';

  const render = () => {
    container.innerHTML = `
      <div class="space-y-4">
        <h2 class="text-xl mb-4 font-poppins text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">${String(t('lobby.addFriends') || 'Add Friends')}</h2>

        <!-- Add Friend Form -->
        <div class="bg-black/40 backdrop-blur-md border-2 border-white/40 p-4 rounded-2xl shadow-xl">
          <div class="flex gap-2 mb-4">
            <input
              type="text"
              id="friend-username-input"
              placeholder="${String(t('lobby.enterUsername') || 'Enter username')}"
              class="flex-1 py-2 px-4 bg-black/30 border-2 border-white/40 rounded-lg text-white placeholder-gray-400 focus:border-white/60 focus:outline-none focus:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-all backdrop-blur-sm"
            />
            <button
              id="send-friend-request-btn"
              class="neon-button border-2 border-white/50 hover:border-white/80 text-white py-2 px-6 rounded-lg font-poppins text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg bg-gradient-to-r from-[#872481] to-[#DC25A3]"
            >
              ${String(t('lobby.add') || 'Add')}
            </button>
          </div>
        </div>

        <!-- Friend Requests -->
        <div class="bg-black/40 backdrop-blur-md border-2 border-white/40 p-4 rounded-2xl shadow-xl">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-poppins font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">${t('lobby.friendRequests')}</h3>
            <button id="refresh-friend-requests-btn" class="text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all p-2 rounded-lg border border-white/30" title="${t('lobby.refresh') || 'Refresh'}">
              <i class="bx bx-refresh text-lg"></i>
            </button>
          </div>
          <div id="friend-requests-list" class="space-y-2">
            <!-- Friend requests will be dynamically inserted here -->
          </div>
        </div>
      </div>
    `;

    // Handle send friend request
    const sendBtn = container.querySelector('#send-friend-request-btn');
    const usernameInput = container.querySelector('#friend-username-input') as HTMLInputElement;

    sendBtn?.addEventListener('click', async () => {
      const username = usernameInput?.value.trim();
      if (!username) {
        showNotification(String(t('common.pleaseEnterUsername') || 'Please enter a username'), 'error');
        return;
      }

      const originalText = sendBtn.textContent;
      sendBtn.textContent = String(t('lobby.sending') || 'Sending');
      (sendBtn as HTMLButtonElement).disabled = true;

      try {
        await sendFriendRequest(username);
        showNotification(String(t('friends.requestSentSimple') || 'Request sent'), 'success');
        usernameInput.value = '';
        loadFriendRequests();
      } catch (error: any) {
        showNotification(error.message || String(t('friends.failedToSend') || 'Failed to send request'), 'error');
      } finally {
        sendBtn.textContent = originalText || String(t('lobby.add') || 'Add');
        (sendBtn as HTMLButtonElement).disabled = false;
      }
    });

    // Handle Enter key on input
    usernameInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        (sendBtn as HTMLButtonElement)?.click();
      }
    });

    // Handle refresh friend requests button
    const refreshBtn = container.querySelector('#refresh-friend-requests-btn');
    refreshBtn?.addEventListener('click', () => {
      const icon = refreshBtn.querySelector('i');
      if (icon) {
        icon.classList.add('animate-spin');
        loadFriendRequests().finally(() => {
          setTimeout(() => {
            icon.classList.remove('animate-spin');
          }, 500);
        });
      }
    });

    loadFriendRequests();
  };

  const loadFriendRequests = async () => {
    try {
      const requests = await getFriendRequests('received');
      renderFriendRequests(requests);
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    }
  };

  const renderFriendRequests = (requests: any[]) => {
    const requestsList = container.querySelector('#friend-requests-list');
    if (!requestsList) return;

    if (requests.length === 0) {
      requestsList.innerHTML = `<p class="text-gray-400 text-sm text-center py-2">${String(t('lobby.noPendingRequests') || 'No pending requests')}</p>`;
      return;
    }

    requestsList.innerHTML = requests.map((request: any) => {
      // Use requesterUsername or requester field from backend, fallback to 'Unknown' if not available
      const requester = request.requesterUsername || request.requester || 'Unknown';
      const requestId = request.id;
      const requesterAvatar = request.requesterAvatar || '/images/pong.png';

      return `
        <div class="flex items-center justify-between bg-gray-800/70 p-3 rounded-lg gap-3">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <img src="${requesterAvatar}" alt="${requester}" class="w-8 h-8 rounded-full object-cover flex-shrink-0" onerror="this.src='/images/pong.png'">
            <span class="text-white font-semibold truncate">${requester}</span>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button
              class="accept-request-btn text-xs px-3 py-1 bg-green-500 hover:bg-green-600 rounded transition-colors font-['Press_Start_2P']"
              data-request-id="${requestId}"
            >
              ✓
            </button>
            <button
              class="reject-request-btn text-xs px-3 py-1 bg-red-500 hover:bg-red-600 rounded transition-colors font-['Press_Start_2P']"
              data-request-id="${requestId}"
            >
              ✗
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners for accept/reject buttons
    container.querySelectorAll('.accept-request-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const requestId = parseInt((e.target as HTMLElement).getAttribute('data-request-id') || '0');
        try {
          await updateFriendRequest(requestId, 'ACCEPTED');
          showNotification(String(t('friends.requestAccepted') || 'Request accepted'), 'success');
          loadFriendRequests();
        } catch (error: any) {
          showNotification(error.message || String(t('friends.failedToAccept') || 'Failed to accept request'), 'error');
        }
      });
    });

    container.querySelectorAll('.reject-request-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const requestId = parseInt((e.target as HTMLElement).getAttribute('data-request-id') || '0');
        try {
          await updateFriendRequest(requestId, 'REJECTED');
          showNotification(String(t('friends.requestRejected') || 'Request rejected'), 'info');
          loadFriendRequests();
        } catch (error: any) {
          showNotification(error.message || String(t('friends.failedToReject') || 'Failed to reject request'), 'error');
        }
      });
    });
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

  render();

  return container;
}

