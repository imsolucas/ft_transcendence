import { navigate } from "../router";
import { AddFriend } from '../components/shared/AddFriend';
import { t } from '../i18n';
import { calculateUserStats } from '../utils/api';
import { gradients, spacing } from '../styles/theme';
import { createLobbyHeader } from '../components/lobby/LobbyHeader';
import { createGameModeButtons, setupGameModeButtons } from '../components/lobby/GameModeButtons';
import { createStatsSection, setupStatsSection } from '../components/lobby/StatsSection';

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
	}, 0);

	return container;
}
