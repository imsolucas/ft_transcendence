// pages/friendsPage.ts
import { gradients, spacing, typography } from '../styles/theme';
import { t } from '../i18n';
import { Avatar } from '../components/ui/Avatar';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { showToast } from '../components/ui/Toast';
import { Spinner } from '../components/ui/Spinner';
import { fetchFriends as apiFetchFriends, getFriendRequests, sendFriendRequest, updateFriendRequest, removeFriend as apiRemoveFriend, searchUsers as apiSearchUsers } from '../utils/api';
import { navigate } from '../router';
import { getCurrentUser } from '../utils/auth-script';

interface Friend {
  id?: number;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'ingame';
}

interface FriendRequest {
  id: number;
  username: string;
  avatar?: string;
  type: 'incoming' | 'outgoing';
}

export function FriendsPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = `min-h-screen ${gradients.pageBackground} pt-20 pb-8`;

  const content = document.createElement('div');
  content.className = `${spacing.container}`;

  // Header
  const header = document.createElement('div');
  header.className = 'mb-8 text-center';
  
  const title = document.createElement('h1');
  title.className = `${typography.title} text-3xl sm:text-5xl text-white mb-4`;
  title.textContent = String(t('friends.title') || 'FRIENDS');
  header.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'text-gray-300 text-lg';
  subtitle.textContent = String(t('friends.subtitle') || 'Manage your friends and friend requests');
  header.appendChild(subtitle);

  content.appendChild(header);

  // Grid layout
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 lg:grid-cols-3 gap-6';

  // Left column - Friends List
  const friendsSection = createFriendsListSection();
  grid.appendChild(friendsSection);

  // Middle column - Friend Requests
  const requestsSection = createFriendRequestsSection();
  grid.appendChild(requestsSection);

  // Right column - Add Friends
  const addFriendsSection = createAddFriendsSection();
  grid.appendChild(addFriendsSection);

  content.appendChild(grid);
  container.appendChild(content);

  // Load data
  loadFriendsData(container);

  return container;
}

function createFriendsListSection(): HTMLElement {
  const section = document.createElement('div');
  section.className = 'lg:col-span-2';

  const card = Card({
    className: 'h-full',
    children: '',
  });

  const headerEl = CardHeader({
    children: '',
  });

  const titleRow = document.createElement('div');
  titleRow.className = 'flex items-center justify-between mb-4';

  const titleEl = CardTitle({
    text: String(t('friends.myFriends') || 'My Friends'),
  });

  const countBadge = Badge({
    text: '0',
    variant: 'info',
    className: 'ml-2',
  });
  countBadge.id = 'friends-count';

  const titleContainer = document.createElement('div');
  titleContainer.className = 'flex items-center gap-2';
  titleContainer.appendChild(titleEl);
  titleContainer.appendChild(countBadge);
  titleRow.appendChild(titleContainer);

  headerEl.appendChild(titleRow);
  card.appendChild(headerEl);

  const contentEl = CardContent({
    children: '',
  });
  contentEl.id = 'friends-list-container';
  contentEl.className = 'max-h-[600px] overflow-y-auto';
  
  // Loading state
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'flex justify-center items-center py-12';
  loadingDiv.appendChild(Spinner({ size: 'lg', label: String(t('common.loading') || 'Loading...') }));
  contentEl.appendChild(loadingDiv);

  card.appendChild(contentEl);
  section.appendChild(card);

  return section;
}

function createFriendRequestsSection(): HTMLElement {
  const section = document.createElement('div');

  const card = Card({
    className: 'h-full',
    children: '',
  });

  const headerEl = CardHeader({
    children: '',
  });

  const titleContainer = document.createElement('div');
  titleContainer.className = 'flex items-center gap-2';

  const titleEl = CardTitle({
    text: String(t('lobby.friendRequests') || 'Friend Requests'),
  });

  const countBadge = Badge({
    text: '0',
    variant: 'warning',
    className: 'ml-2',
  });
  countBadge.id = 'requests-count';

  titleContainer.appendChild(titleEl);
  titleContainer.appendChild(countBadge);
  headerEl.appendChild(titleContainer);
  card.appendChild(headerEl);

  const contentEl = CardContent({
    children: '',
  });
  contentEl.id = 'requests-list-container';
  contentEl.className = 'max-h-[400px] overflow-y-auto';
  
  // Loading state
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'flex justify-center items-center py-8';
  loadingDiv.appendChild(Spinner({ size: 'md', label: String(t('common.loading') || 'Loading...') }));
  contentEl.appendChild(loadingDiv);

  card.appendChild(contentEl);
  section.appendChild(card);

  return section;
}

function createAddFriendsSection(): HTMLElement {
  const section = document.createElement('div');

  const card = Card({
    className: 'h-full',
    children: '',
  });

  const headerEl = CardHeader({
    children: CardTitle({
      text: String(t('lobby.addFriends') || 'Add Friend'),
    }),
  });
  card.appendChild(headerEl);

  const contentEl = CardContent({
    children: '',
  });

  // Search form
  const form = document.createElement('form');
  form.id = 'add-friend-form';
  form.className = 'space-y-4';

  // Add label for search input
  const searchLabel = Label({
    text: String(t('friends.findPlayers') || 'Find Players'),
    htmlFor: 'search-user-input',
    className: 'text-white',
  });
  form.appendChild(searchLabel);

  const searchInput = Input({
    id: 'search-user-input',
    placeholder: String(t('friends.searchByUsername') || 'Search by username...'),
    className: 'w-full',
  });
  form.appendChild(searchInput);

  const searchBtn = Button({
    text: String(t('common.search') || 'Search'),
    variant: 'default',
    className: 'w-full',
  });
  form.appendChild(searchBtn);

  contentEl.appendChild(form);

  // Search results
  const resultsDiv = document.createElement('div');
  resultsDiv.id = 'search-results';
  resultsDiv.className = 'mt-6 space-y-3';
  contentEl.appendChild(resultsDiv);

  card.appendChild(contentEl);
  section.appendChild(card);

  // Handle search form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = searchInput as HTMLInputElement;
    const username = input.value.trim();
    
    if (!username) {
      showToast({ message: String(t('common.pleaseEnterUsername') || 'Please enter a username'), variant: 'warning' });
      return;
    }

    await searchUsersDisplay(username, resultsDiv);
  });

  return section;
}

async function loadFriendsData(container: HTMLElement): Promise<void> {
  try {
    // Mock API call - replace with actual API
    const friends = await fetchFriends();
    const requests = await fetchFriendRequests();

    renderFriendsList(container, friends);
    renderFriendRequests(container, requests);
  } catch (error) {
    console.error('Error loading friends data:', error);
    showToast({ message: String(t('friends.failedToLoad') || 'Failed to load friends'), variant: 'error' });
  }
}

function renderFriendsList(container: HTMLElement, friends: Friend[]): void {
  const listContainer = container.querySelector('#friends-list-container');
  const countBadge = container.querySelector('#friends-count');
  
  if (!listContainer) return;

  if (countBadge) {
    countBadge.textContent = friends.length.toString();
  }

  listContainer.innerHTML = '';

  if (friends.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'text-center py-12 text-gray-400';
    emptyDiv.textContent = String(t('friends.noFriendsYet') || 'No friends yet. Add some friends to get started!');
    listContainer.appendChild(emptyDiv);
    return;
  }

  friends.forEach(friend => {
    const friendItem = document.createElement('div');
    friendItem.className = 'flex items-center justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors';

    const leftSection = document.createElement('div');
    leftSection.className = 'flex items-center gap-4';

    const avatar = Avatar({
      src: friend.avatar,
      alt: friend.username,
      fallback: friend.username[0],
      size: 'md',
      status: friend.status,
    });
    leftSection.appendChild(avatar);

    const info = document.createElement('div');
    const username = document.createElement('div');
    username.className = 'text-white font-semibold';
    username.textContent = friend.username;
    info.appendChild(username);

    const statusBadge = StatusBadge({ status: friend.status });
    info.appendChild(statusBadge);
    leftSection.appendChild(info);

    friendItem.appendChild(leftSection);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'flex gap-2';

    const viewBtn = Button({
      text: String(t('friends.view') || 'View'),
      variant: 'outline',
      size: 'sm',
      onClick: () => viewProfile(friend.username),
    });
    actions.appendChild(viewBtn);

    const removeBtn = Button({
      text: String(t('friends.remove') || 'Remove'),
      variant: 'destructive',
      size: 'sm',
      onClick: () => removeFriendLocal(friend.username, container),
    });
    actions.appendChild(removeBtn);

    friendItem.appendChild(actions);
    listContainer.appendChild(friendItem);
  });
}

function renderFriendRequests(container: HTMLElement, requests: FriendRequest[]): void {
  const listContainer = container.querySelector('#requests-list-container');
  const countBadge = container.querySelector('#requests-count');
  
  if (!listContainer) return;

  if (countBadge) {
    countBadge.textContent = requests.length.toString();
  }

  listContainer.innerHTML = '';

  if (requests.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'text-center py-8 text-gray-400 text-sm';
    emptyDiv.textContent = String(t('lobby.noPendingRequests') || 'No pending requests');
    listContainer.appendChild(emptyDiv);
    return;
  }

  requests.forEach(request => {
    const requestItem = document.createElement('div');
    requestItem.className = 'flex items-center justify-between p-3 rounded-lg bg-gray-700/30 mb-3';

    const leftSection = document.createElement('div');
    leftSection.className = 'flex items-center gap-3';

    const avatar = Avatar({
      src: request.avatar,
      alt: request.username,
      fallback: request.username[0],
      size: 'sm',
    });
    leftSection.appendChild(avatar);

    const username = document.createElement('div');
    username.className = 'text-white text-sm font-semibold';
    username.textContent = request.username;
    leftSection.appendChild(username);

    requestItem.appendChild(leftSection);

    // Actions based on type
    const actions = document.createElement('div');
    actions.className = 'flex gap-2';

    if (request.type === 'incoming') {
      const acceptBtn = Button({
        text: '✓',
        variant: 'default',
        size: 'sm',
        onClick: () => acceptFriendRequest(request.id, container),
      });
      actions.appendChild(acceptBtn);

      const rejectBtn = Button({
        text: '✕',
        variant: 'destructive',
        size: 'sm',
        onClick: () => rejectFriendRequest(request.id, container),
      });
      actions.appendChild(rejectBtn);
    } else {
      const cancelBtn = Button({
        text: String(t('common.cancel') || 'Cancel'),
        variant: 'outline',
        size: 'sm',
        onClick: () => cancelFriendRequest(request.id, container),
      });
      actions.appendChild(cancelBtn);
    }

    requestItem.appendChild(actions);
    listContainer.appendChild(requestItem);
  });
}

async function searchUsersDisplay(username: string, resultsContainer: HTMLElement): Promise<void> {
  resultsContainer.innerHTML = '';
  
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'flex justify-center py-4';
  loadingDiv.appendChild(Spinner({ size: 'sm' }));
  resultsContainer.appendChild(loadingDiv);

  try {
    const users = await searchUsersLocal(username);
    
    resultsContainer.innerHTML = '';

    if (users.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'text-center py-4 text-gray-400 text-sm';
      emptyDiv.textContent = String(t('common.noUsersFound') || 'No users found');
      resultsContainer.appendChild(emptyDiv);
      return;
    }

    users.forEach(user => {
      const userItem = document.createElement('div');
      userItem.className = 'flex items-center justify-between p-3 rounded-lg bg-gray-700/30';

      const leftSection = document.createElement('div');
      leftSection.className = 'flex items-center gap-3';

      const avatar = Avatar({
        src: user.avatar,
        alt: user.username,
        fallback: user.username[0],
        size: 'sm',
      });
      leftSection.appendChild(avatar);

      const username = document.createElement('div');
      username.className = 'text-white text-sm font-semibold';
      username.textContent = user.username;
      leftSection.appendChild(username);

      userItem.appendChild(leftSection);

      const addBtn = Button({
        text: String(t('lobby.add') || 'Add'),
        variant: 'default',
        size: 'sm',
        onClick: () => handleSendFriendRequest(user.username),
      });
      userItem.appendChild(addBtn);

      resultsContainer.appendChild(userItem);
    });
  } catch (error) {
    console.error('Error searching users:', error);
    resultsContainer.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-center py-4 text-red-400 text-sm';
      errorDiv.textContent = String(t('common.searchFailed') || 'Search failed');
    resultsContainer.appendChild(errorDiv);
  }
}

// Helper function to map backend status to frontend status
function mapStatus(status: string): 'online' | 'offline' | 'ingame' {
  const upperStatus = status.toUpperCase();
  if (upperStatus === 'ONLINE') return 'online';
  if (upperStatus === 'INGAME') return 'ingame';
  return 'offline';
}

// API Functions - Real implementations
async function fetchFriends(): Promise<Friend[]> {
  try {
    const friends = await apiFetchFriends();
    return friends.map((friend: any) => ({
      username: friend.username,
      avatar: friend.picture || friend.avatar || '/images/pong.png',
      status: mapStatus(friend.status || 'OFFLINE'),
    }));
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
}

async function fetchFriendRequests(): Promise<FriendRequest[]> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return [];

    const [incoming, outgoing] = await Promise.all([
      getFriendRequests('received'),
      getFriendRequests('sent'),
    ]);

    const requests: FriendRequest[] = [];

    // Map incoming requests
    incoming.forEach((req: any) => {
      requests.push({
        id: req.id,
        username: req.requester || req.requesterUsername,
        avatar: req.requesterAvatar || '/images/pong.png',
        type: 'incoming',
      });
    });

    // Map outgoing requests
    outgoing.forEach((req: any) => {
      requests.push({
        id: req.id,
        username: req.addresseeUsername,
        avatar: '/images/pong.png',
        type: 'outgoing',
      });
    });

    return requests;
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
}

async function searchUsersLocal(query: string): Promise<Array<{id: number; username: string; avatar?: string}>> {
  try {
    const users = await apiSearchUsers(query);
    return users.map((user: any) => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar || '/images/pong.png',
    }));
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

async function handleSendFriendRequest(username: string): Promise<void> {
  try {
    await sendFriendRequest(username);
    showToast({ 
      message: String(t('friends.requestSentSimple') || 'Friend request sent!'), 
      variant: 'success',
      duration: 3000 
    });
  } catch (error: any) {
    console.error('Error sending friend request:', error);
    showToast({ 
      message: error.message || String(t('friends.failedToSend') || 'Failed to send friend request'), 
      variant: 'error',
      duration: 3000 
    });
  }
}

async function acceptFriendRequest(requestId: number, container: HTMLElement): Promise<void> {
  try {
    await updateFriendRequest(requestId, 'ACCEPTED');
    showToast({ 
      	message: String(t('friends.requestAccepted') || 'Friend request accepted!'), 
      variant: 'success',
      duration: 3000 
    });
    await loadFriendsData(container);
  } catch (error: any) {
    console.error('Error accepting friend request:', error);
    showToast({ 
      message: error.message || String(t('friends.failedToAccept') || 'Failed to accept friend request'), 
      variant: 'error',
      duration: 3000 
    });
  }
}

async function rejectFriendRequest(requestId: number, container: HTMLElement): Promise<void> {
  try {
    await updateFriendRequest(requestId, 'REJECTED');
    showToast({ 
      message: String(t('friends.requestRejected') || 'Friend request rejected'), 
      variant: 'info',
      duration: 3000 
    });
    await loadFriendsData(container);
  } catch (error: any) {
    console.error('Error rejecting friend request:', error);
    showToast({ 
      message: error.message || String(t('friends.failedToReject') || 'Failed to reject friend request'), 
      variant: 'error',
      duration: 3000 
    });
  }
}

async function cancelFriendRequest(requestId: number, container: HTMLElement): Promise<void> {
  try {
    // Cancel is the same as reject from sender's perspective
    await updateFriendRequest(requestId, 'REJECTED');
    showToast({ 
      message: String(t('friends.requestCancelled') || 'Friend request cancelled'), 
      variant: 'info',
      duration: 3000 
    });
    await loadFriendsData(container);
  } catch (error: any) {
    console.error('Error cancelling friend request:', error);
    showToast({ 
      message: error.message || String(t('friends.failedToCancel') || 'Failed to cancel friend request'), 
      variant: 'error',
      duration: 3000 
    });
  }
}

async function removeFriendLocal(username: string, container: HTMLElement): Promise<void> {
  const confirmMessage = String(t('friends.confirmRemove') || 'Are you sure you want to remove this friend?');
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    await apiRemoveFriend(username);
    showToast({ 
      message: String(t('friends.friendRemoved') || 'Friend removed'), 
      variant: 'success',
      duration: 3000 
    });
    await loadFriendsData(container);
  } catch (error: any) {
    console.error('Error removing friend:', error);
    showToast({ 
      message: error.message || String(t('friends.friendRemovedError') || 'Failed to remove friend'), 
      variant: 'error',
      duration: 3000 
    });
  }
}

function viewProfile(username: string): void {
  navigate('profile', `username=${encodeURIComponent(username)}`);
}

