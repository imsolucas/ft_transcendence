import { navigate } from "../router";
import { AddFriend } from '../components/shared/AddFriend';
import { t } from '../i18n';
import { calculateUserStats, searchUsers, fetchOnlineUsers } from '../utils/api';
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
				children: CardTitle({ text: String(t('lobby.quickActions') || 'Quick Actions') }),
			});
			actionsCard.appendChild(header);
			
			const content = CardContent({ children: '' });
			content.className += ' flex gap-4 items-center flex-wrap';
			
			// Quick search input with button - wrap in relative container for dropdown positioning
			const searchContainer = document.createElement('div');
			searchContainer.className = 'relative flex-1 min-w-[200px]';
			
			// Add Stimulus controller for search functionality
			searchContainer.setAttribute('data-controller', 'search');
			searchContainer.setAttribute('data-search-search-query-value', '');
			searchContainer.setAttribute('data-search-show-results-value', 'false');
			searchContainer.setAttribute('data-search-target', 'container');
			
			const searchInputWrapper = document.createElement('div');
			searchInputWrapper.className = 'flex gap-2';
			const searchInputElement = Input({
				id: 'quick-search',
				placeholder: String(t('lobby.searchPlayers') || 'Search players...'),
				className: 'flex-1',
			});
			
			// Add Stimulus target for input
			searchInputElement.setAttribute('data-search-target', 'input');
			
			searchInputWrapper.appendChild(searchInputElement);
			
			// Search results container - positioned relative to searchContainer
			const searchResultsContainer = document.createElement('div');
			searchResultsContainer.id = 'lobby-search-results';
			searchResultsContainer.className = 'hidden absolute top-full left-0 mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto';
			
			// Add Stimulus target for results
			searchResultsContainer.setAttribute('data-search-target', 'results');
			
			searchContainer.appendChild(searchResultsContainer);
			
			// Search functionality - only triggered by button click
			// Helper function to get Stimulus controller
			const getSearchController = () => {
				// Stimulus stores controllers on the element
				const application = (window as any).Stimulus?.application;
				if (application) {
					return application.getControllerForElementAndIdentifier(searchContainer, 'search');
				}
				return null;
			};
			
			const performSearch = async () => {
				if (!searchInputElement) {
					console.error('Search input element not found');
					return;
				}
				
				const query = searchInputElement.value.trim();
				if (query.length < 2) {
					const controller = getSearchController();
					if (controller) {
						controller.closeResults();
					} else {
						searchResultsContainer.classList.add('hidden');
					}
					showToast({ 
						message: String(t('common.pleaseEnterUsername') || 'Please enter at least 2 characters'), 
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
					const controller = getSearchController();
					if (controller) {
						controller.searchQueryValue = '';
					}
					
					if (!users || users.length === 0) {
						// No results - show toast and hide dropdown
						if (controller) {
							controller.closeResults();
						} else {
							searchResultsContainer.classList.add('hidden');
						}
						showToast({ 
							message: String(t('common.noUsersFound') || 'No users found'), 
							variant: 'info',
							duration: 3000 
						});
					} else if (users.length === 1) {
						// Single result - show modal directly
						if (controller) {
							controller.closeResults();
						} else {
							searchResultsContainer.classList.add('hidden');
						}
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
								const controller = getSearchController();
								if (controller) {
									controller.searchQueryValue = '';
									controller.closeResults();
								} else {
									searchResultsContainer.classList.add('hidden');
								}
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
						
						// Show results
						if (controller) {
							controller.showResultsValue = true;
						} else {
							searchResultsContainer.classList.remove('hidden');
						}
					}
				} catch (error: any) {
					console.error('Error searching users:', error);
					const controller = getSearchController();
					if (controller) {
						controller.closeResults();
					} else {
						searchResultsContainer.classList.add('hidden');
					}
					const errorMessage = error?.message || String(t('common.searchFailed') || 'Search failed');
					showToast({ 
						message: errorMessage, 
						variant: 'error',
						duration: 3000 
					});
				}
			};
			
			// Search button
			const searchButton = Button({
				text: String(t('common.search') || 'Search'),
				variant: 'default',
				size: 'default',
				onClick: performSearch,
			});
			searchButton.setAttribute('data-action', 'click->search#performSearch');
			searchInputWrapper.appendChild(searchButton);
			
			searchContainer.appendChild(searchInputWrapper);
			content.appendChild(searchContainer);
			
			// Quick actions dropdown (demonstrates Dropdown component)
			const dropdown = Dropdown({
				trigger: String(t('lobby.actions') || 'Actions'),
				items: [
					{ value: 'profile', label: String(t('navbar.profile') || 'View Profile'), icon: '👤' },
					{ value: 'friends', label: String(t('navbar.friends') || 'Friends'), icon: '👥' },
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
					const controller = getSearchController();
					if (controller) {
						controller.closeResults();
					} else {
						searchResultsContainer.classList.add('hidden');
					}
				}
			});
			
			// Close search results when clicking outside - handled by SearchController
			
			// Info button (demonstrates Modal usage)
			const infoBtn = Button({
				text: `ℹ️ ${String(t('common.info') || 'Info')}`,
				variant: 'outline',
				size: 'default',
				onClick: async () => {
					// Fetch online users
					let onlineUsersList = '';
					try {
						const onlineUsers = await fetchOnlineUsers();
						if (onlineUsers.length === 0) {
							onlineUsersList = `<p class="text-gray-400 text-sm">${String(t('lobby.noOnlineUsers') || 'No other users online at the moment.')}</p>`;
						} else {
							onlineUsersList = `
								<ul class="list-disc list-inside space-y-1 text-sm">
									${onlineUsers.map((user: any) => `
										<li class="text-gray-300">
											<span class="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
											${user.username}
										</li>
									`).join('')}
								</ul>
							`;
						}
					} catch (error) {
						console.error('Error fetching online users:', error);
						onlineUsersList = `<p class="text-red-400 text-sm">${String(t('common.errorLoading') || 'Error loading online users.')}</p>`;
					}

					showModal({
						title: String(t('lobby.infoTitle') || 'Lobby Information'),
						content: `
							<div class="space-y-3">
								<p class="text-gray-300">${String(t('lobby.infoText') || 'You are in the main lobby.')}</p>
								<div>
									<p class="text-gray-300 mb-2">${String(t('lobby.infoActivePlayers') || 'Active players online:')}</p>
									${onlineUsersList}
								</div>
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
			title: String(t('lobby.lobbyChat') || 'Lobby Chat'),
			onSendMessage: (message) => {
				console.log('Send message:', message);
				showToast({ 
					message: String(t('common.messageSent') || 'Message sent!'), 
					variant: 'success',
					duration: 2000 
				});
			},
			collapsed: true, // Start collapsed
		});
		container.appendChild(chatSidebar);
		
		// Stimulus automatically initializes controllers on new elements
		// No manual initialization needed
		} catch (error) {
			console.error('Error setting up lobby components:', error);
			console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		}
	}, 0);

	return container;
}
