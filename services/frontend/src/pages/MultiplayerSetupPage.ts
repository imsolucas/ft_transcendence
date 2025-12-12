import { t } from '../i18n';
import { navigate } from '../router';
import { GameConfig } from '../components/game-config/GameConfigForm';
import { gameStorage } from '../types/game';
import { type GameConfig as GameConfigType } from 'shared/index';
import { escapeHtml } from '../utils/sanitize';
import { gradients, spacing, typography, effects } from '../styles/theme';
import { createMultiplayerHeader } from '../components/multiplayer/MultiplayerHeader';
import { createGameModeSelection, setupGameModeSelection } from '../components/local-game/GameModeSelection';
import { createLobbyOptions, setupLobbyOptions } from '../components/multiplayer/LobbyOptions';

type GameMode = 'standard' | 'tournament';

export function MultiplayerGamePage(): HTMLElement {
	const container = document.createElement('div');
	container.className = `min-h-screen ${gradients.pageBackground} pt-16 overflow-y-auto`;

	let selectedGameMode: GameMode = 'standard';

	const renderModeSelection = () => {
		try {
			container.innerHTML = `
				<div class="relative min-h-screen">
					<div class="${spacing.container} py-8">
						${createMultiplayerHeader()}
						${createGameModeSelection()}
					</div>
				</div>
			`;

			setupGameModeSelection(
				container,
				() => {
					selectedGameMode = 'standard';
					renderLobbySelection();
				},
				() => {
					selectedGameMode = 'tournament';
					renderLobbySelection();
				},
				() => navigate('lobby'),
				true // isMultiplayer = true
			);
		} catch (error) {
			console.error('Error rendering mode selection:', error);
			container.innerHTML = `
				<div class="text-center text-white p-8">
					<p class="${typography.subtitle}">Error loading game mode selection</p>
				</div>
			`;
		}
	};

	const renderLobbySelection = () => {
		try {
			container.innerHTML = `
				<div class="relative min-h-screen">
					<div class="${spacing.container} py-8">
						${createMultiplayerHeader()}
						${createLobbyOptions()}
					</div>
				</div>
			`;

			setupLobbyOptions(
				container,
				() => {
					gameStorage.setGameOptions({ type: 'random', mode: selectedGameMode});
					navigate('game');
				},
				() => {
					renderConfig();
				},
				(lobbyId: string) => {
					gameStorage.setGameOptions({ type: 'join-room', mode: selectedGameMode, roomId: lobbyId });
					navigate('game');
				},
				() => {
					renderModeSelection();
				}
			);
		} catch (error) {
			console.error('Error rendering lobby selection:', error);
			container.innerHTML = `
				<div class="text-center text-white p-8">
					<p class="${typography.subtitle}">Error loading lobby options</p>
				</div>
			`;
		}
	};

	const renderConfig = () => {
		try {
			container.innerHTML = `
				<div class="relative min-h-screen">
					<div class="${spacing.container} py-8">
						<header class="text-center mb-8">
							<h1 class="${typography.title} ${effects.textShadow.heavy} mb-4 text-white">
								${escapeHtml(t('gameConfig.title'))}
							</h1>
						</header>

						<div class="max-w-2xl mx-auto" id="game-config-container"></div>
					</div>
				</div>
			`;

			setTimeout(() => {
				const configContainer = container.querySelector('#game-config-container');
				if (!configContainer) {
					console.warn('Config container not found in DOM');
					return;
				}

				try {
					const gameConfig = GameConfig({
						mode: selectedGameMode,
						isMultiplayer: true,
						numPlayers: selectedGameMode === 'tournament' ? 2 : 2,
						onSubmit: (config: GameConfigType) => {
							gameStorage.setGameOptions({ type: 'create-room', mode: selectedGameMode, config: config });
							navigate('game');
						},
						onCancel: () => {
							renderLobbySelection();
						}
					});
					configContainer.appendChild(gameConfig);
				} catch (error) {
					console.error('Error creating game config:', error);
					configContainer.innerHTML = `
						<div class="text-center text-white p-8">
							<p class="${typography.subtitle}">Error loading game configuration</p>
						</div>
					`;
				}
			}, 0);
		} catch (error) {
			console.error('Error rendering config:', error);
			container.innerHTML = `
				<div class="text-center text-white p-8">
					<p class="${typography.subtitle}">Error loading configuration</p>
				</div>
			`;
		}
	};

	renderModeSelection();

	return container;
}

