import { t } from '../i18n';
import { navigate } from '../router';
import { GameConfig } from '../components/game-config/GameConfigForm';
import { gameStorage } from '../types/game';
import { type GameConfig as GameConfigType } from 'shared/index';
import { escapeHtml } from '../utils/sanitize';
import { gradients, spacing, typography, effects } from '../styles/theme';
import { createLocalGameHeader } from '../components/local-game/LocalGameHeader';
import { createGameModeSelection, setupGameModeSelection } from '../components/local-game/GameModeSelection';

export function LocalGamePage(): HTMLElement {
	const container = document.createElement('div');
	container.className = `min-h-screen ${gradients.pageBackground} pt-16 overflow-y-auto`;

	const renderSelection = () => {
		try {
			container.innerHTML = `
				<div class="relative min-h-screen">
					<div class="${spacing.container} py-8">
						${createLocalGameHeader()}
						${createGameModeSelection()}
					</div>
				</div>
			`;

			setupGameModeSelection(
				container,
				() => {
					renderConfig('standard');
				},
				() => {
					renderConfig('tournament');
				},
				() => navigate('lobby')
			);
		} catch (error) {
			console.error('Error rendering local game selection:', error);
			container.innerHTML = `
				<div class="text-center text-white p-8">
					<p class="${typography.subtitle}">Error loading game selection</p>
				</div>
			`;
		}
	};

	const renderConfig = (mode: 'standard' | 'tournament') => {
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
						mode: mode,
						isMultiplayer: false,
						onSubmit: (config: GameConfigType) => {
							gameStorage.setGameOptions({ type: 'local', config: config });
							navigate('game');
						},
						onCancel: () => {
							renderSelection();
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

	renderSelection();

	return container;
}

