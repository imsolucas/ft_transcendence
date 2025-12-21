import { navigate } from "../router";
import { AddFriend } from '../components/shared/AddFriend';
import { t } from '../i18n';
import { calculateUserStats, searchUsers } from '../utils/api';
import { gradients, spacing } from '../styles/theme';
import { createLobbyHeader } from '../components/lobby/LobbyHeader';
import { createGameModeButtons, setupGameModeButtons } from '../components/lobby/GameModeButtons';
import { createStatsSection, setupStatsSection } from '../components/lobby/StatsSection';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { showModal } from '../components/ui/Modal';
import { Dropdown } from '../components/ui/Dropdown';
import { showToast } from '../components/ui/Toast';
import { createChatSidebar } from '../components/chat/ChatPanel';
import { Avatar } from '../components/ui/Avatar';
import { showUserProfileModal } from '../components/user/UserProfileModal';

export function LobbyPage(): HTMLElement {
	const container = document.createElement('div');
	container.className = `min-h-screen ${gradients.pageBackground} pt-16`;

	container.innerHTML = `
		<div class="relative min-h-screen flex items-center justify-center overflow-hidden py-8">
			<div class="relative z-10 ${spacing.container}">
				${createLobbyHeader(t('lobby.title'), t('lobby.subtitle'))}

				<div class="max-w-6xl mx-auto">
					<!-- Grid layout for better space utilization -->
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
						<!-- Left column: Game modes -->
						<div>
							${createGameModeButtons(
								t('lobby.localGame'),
								t('lobby.multiplayer'),
								t('lobby.gameModes')
							)}
						</div>

						<!-- Right column: Stats -->
						<div>
							${createStatsSection(
								t('lobby.wins'),
								t('lobby.losses'),
								t('lobby.quickStats'),
								t('lobby.refresh') || 'Refresh'
							)}
						</div>
					</div>

					<!-- Full width: Add friend section -->
					<div class="mt-8">
						<div id="add-friend-container"></div>
					</div>
					
					<!-- Quick Actions with Dropdown -->
					<div class="mt-8">
						<div id="quick-actions-container"></div>
					</div>
				</div>
			</div>
		</div>
	`;

	const loadStats = async (): Promise<void> => {
		try {
			const stats = await calculateUserStats();
			const winsElement = container.querySelector('#lobby-wins');
			const lossesElement = container.querySelector('#lobby-losses');
			if (winsElement) winsElement.textContent = String(stats.wins || 0);
			if (lossesElement) lossesElement.textContent = String(stats.losses || 0);
		} catch (error) {
			console.error('Failed to load stats:', error);
			const winsElement = container.querySelector('#lobby-wins');
			const lossesElement = container.querySelector('#lobby-losses');
			if (winsElement) winsElement.textContent = '0';
			if (lossesElement) lossesElement.textContent = '0';
		}
	};

	// Setup all components after DOM is ready
	setTimeout(() => {
		try {
			setupGameModeButtons(
				container,
				() => navigate('local-game'),
				() => navigate('multiplayer-game')
			);

			setupStatsSection(container, loadStats);

			const addFriendContainer = container.querySelector('#add-friend-container');
			if (addFriendContainer) {
				try {
					const addFriendComponent = AddFriend();
					addFriendContainer.appendChild(addFriendComponent);
				} catch (error) {
					console.error('Error initializing AddFriend component:', error);
				}
			} else {
				console.warn('Add friend container not found');
			}
		
		// Add quick actions dropdown
		const quickActionsContainer = container.querySelector('#quick-actions-container');
		if (quickActionsContainer) {
			console.log('Quick Actions container found, adding card...');
			const actionsCard = Card({
				className: 'bg-gray-800/50',
				children: '',
			});
			
			const header = CardHeader({
				children: CardTitle({ text: String(t('QuickActions') || 'Quick Actions') }),
			});
			actionsCard.appendChild(header);
			
			const content = CardContent({ children: '' });
			content.className += ' flex gap-4 items-center flex-wrap';
			
			// Quick search input with button - wrap in relative container for dropdown positioning
			const searchContainer = document.createElement('div');
			searchContainer.className = 'relative flex-1 min-w-[200px]';
			
			// Add Alpine.js directive for reactive state (framework usage)
			searchContainer.setAttribute('x-data', "{ searchQuery: '', showResults: false }");
			
			const searchInputWrapper = document.createElement('div');
			searchInputWrapper.className = 'flex gap-2';
			const searchInputElement = Input({
				id: 'quick-search',
				placeholder: String(t('Search Players') || 'Search players...'),
				className: 'flex-1',
			});
			
			// Add Alpine.js x-model for two-way data binding (framework usage)
			searchInputElement.setAttribute('x-model', 'searchQuery');
			
			searchInputWrapper.appendChild(searchInputElement);
			
			// Search results container - positioned relative to searchContainer
			const searchResultsContainer = document.createElement('div');
			searchResultsContainer.id = 'lobby-search-results';
			searchResultsContainer.className = 'hidden absolute top-full left-0 mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto';
			
			// Add Alpine.js directive for conditional rendering (framework usage)
			searchResultsContainer.setAttribute('x-show', 'showResults');
			searchResultsContainer.setAttribute('@click.away', 'showResults = false');
			
			searchContainer.appendChild(searchResultsContainer);
			
			// Search functionality - only triggered by button click
			// Alpine.js reactive state is available via x-data, but we keep existing logic for compatibility
			const performSearch = async () => {
				if (!searchInputElement) {
					console.error('Search input element not found');
					return;
				}
				
				const query = searchInputElement.value.trim();
				if (query.length < 2) {
					if (window.Alpine && searchContainer.__x) {
						searchContainer.__x.$data.showResults = false;
					}
					searchResultsContainer.classList.add('hidden');
					showToast({ 
						message: String(t('friends.enterUsername') || 'Please enter at least 2 characters'), 
						variant: 'warning',
						duration: 3000 
					});
					return;
				}
				
				console.log('Performing search for:', query);
				try {
					const users = await searchUsers(query);
					console.log('Search results:', users);
					
					// Clear search input after search
					searchInputElement.value = '';
					if (window.Alpine && searchContainer.__x) {
						searchContainer.__x.$data.searchQuery = '';
					}
					
					if (!users || users.length === 0) {
						// No results - show toast and hide dropdown
						if (window.Alpine && searchContainer.__x) {
							searchContainer.__x.$data.showResults = false;
						}
						searchResultsContainer.classList.add('hidden');
						showToast({ 
							message: String(t('No users found') || 'No users found'), 
							variant: 'info',
							duration: 3000 
						});
					} else if (users.length === 1) {
						// Single result - show modal directly
						if (window.Alpine && searchContainer.__x) {
							searchContainer.__x.$data.showResults = false;
						}
						searchResultsContainer.classList.add('hidden');
						await showUserProfileModal(users[0].username);
					} else {
						// Multiple results - show dropdown
						searchResultsContainer.innerHTML = '';
						
						users.forEach((user: any) => {
							const userItem = document.createElement('div');
							userItem.className = 'flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer transition-colors';
							userItem.addEventListener('click', async () => {
								// Show user profile modal instead of navigating directly
								await showUserProfileModal(user.username);
								
								// Clear search
								if (window.Alpine && searchContainer.__x) {
									searchContainer.__x.$data.searchQuery = '';
									searchContainer.__x.$data.showResults = false;
								}
								searchResultsContainer.classList.add('hidden');
							});
							
							const avatar = Avatar({
								src: user.avatar || '/images/pong.png',
								alt: user.username,
								fallback: user.username[0],
								size: 'sm',
							});
							userItem.appendChild(avatar);
							
							const username = document.createElement('span');
							username.className = 'text-white font-semibold';
							username.textContent = user.username;
							userItem.appendChild(username);
							
							searchResultsContainer.appendChild(userItem);
						});
						
						if (window.Alpine && searchContainer.__x) {
							searchContainer.__x.$data.showResults = true;
						}
						searchResultsContainer.classList.remove('hidden');
					}
				} catch (error: any) {
					console.error('Error searching users:', error);
					if (window.Alpine && searchContainer.__x) {
						searchContainer.__x.$data.showResults = false;
					}
					searchResultsContainer.classList.add('hidden');
					const errorMessage = error?.message || String(t('Search failed') || 'Search failed');
					showToast({ 
						message: errorMessage, 
						variant: 'error',
						duration: 3000 
					});
				}
			};
			
			// Search button
			const searchButton = Button({
				text: String(t('Search') || 'Search'),
				variant: 'default',
				size: 'default',
				onClick: performSearch,
			});
			searchInputWrapper.appendChild(searchButton);
			
			searchContainer.appendChild(searchInputWrapper);
			content.appendChild(searchContainer);
			
			// Quick actions dropdown (demonstrates Dropdown component)
			const dropdown = Dropdown({
				trigger: String(t('Actions') || 'Actions'),
				items: [
					{ value: 'profile', label: String(t('navbar.profile') || 'View Profile'), icon: '👤' },
					{ value: 'friends', label: String(t('Friends') || 'Friends'), icon: '👥' },
					{ value: 'help', label: String(t('common.help') || 'Help'), icon: '❓' },
				],
				direction: 'up', // Expand upward so all options are visible
				onSelect: (value) => {
					if (value === 'profile') {
						navigate('profile');
					} else if (value === 'friends') {
						navigate('friends');
					} else if (value === 'help') {
						// Show help modal (demonstrates Modal component)
						showModal({
							title: String(t('lobby.helpTitle') || 'Lobby Help'),
							content: `
								<div class="space-y-4">
									<p class="text-gray-300">${String(t('lobby.helpText') || 'Welcome to the lobby! Here you can:')}</p>
									<ul class="list-disc list-inside text-gray-300 space-y-2">
										<li>${String(t('lobby.helpItem1') || 'Start a local game')}</li>
										<li>${String(t('lobby.helpItem2') || 'Join multiplayer games')}</li>
										<li>${String(t('lobby.helpItem3') || 'View your stats')}</li>
										<li>${String(t('lobby.helpItem4') || 'Search for players')}</li>
										<li>${String(t('lobby.helpItem5') || 'Chat with others')}</li>
									</ul>
								</div>
							`,
							showCloseButton: true,
						});
					}
				},
			});
			content.appendChild(dropdown);
			
			// Add event listener for Escape key to close results
			searchInputElement.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					searchResultsContainer.classList.add('hidden');
				}
			});
			
			// Close search results when clicking outside
			document.addEventListener('click', (e) => {
				if (!searchContainer.contains(e.target as Node)) {
					searchResultsContainer.classList.add('hidden');
				}
			});
			
			// Info button (demonstrates Modal usage)
			const infoBtn = Button({
				text: 'ℹ️ Info',
				variant: 'outline',
				size: 'default',
				onClick: () => {
				showModal({
					title: String(t('lobby.infoTitle') || 'Lobby Information'),
					content: `
						<div class="space-y-3">
							<p class="text-gray-300">${String(t('lobby.infoText') || 'You are in the main lobby.')}</p>
							<p class="text-gray-300">${String(t('lobby.infoActivePlayers') || 'Active players online:')} <strong class="text-white">${String(t('common.loading') || 'Loading...')}</strong></p>
							<p class="text-sm text-gray-400">${String(t('lobby.infoTip') || 'Tip: Use quick search to find other players!')}</p>
						</div>
					`,
					showCloseButton: true,
				});
				},
			});
			content.appendChild(infoBtn);
			
			actionsCard.appendChild(content);
			quickActionsContainer.appendChild(actionsCard);
			console.log('Quick Actions card added to container');
		} else {
			console.error('Quick Actions container not found!', container);
		}
		
		// Add chat sidebar to lobby (demonstrates ChatPanel component)
		const chatSidebar = createChatSidebar({
			title: String(t('Lobby Chat') || 'Lobby Chat'),
			onSendMessage: (message) => {
				console.log('Send message:', message);
				showToast({ 
					message: String(t('Message Sent') || 'Message sent!'), 
					variant: 'success',
					duration: 2000 
				});
			},
			collapsed: true, // Start collapsed
		});
		container.appendChild(chatSidebar);
		} catch (error) {
			console.error('Error setting up lobby components:', error);
			console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		}
	}, 0);

	return container;
}
