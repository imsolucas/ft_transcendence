import { escapeHtml } from '../../utils/sanitize';
import { typography, effects } from '../../styles/theme';
import { t } from '../../i18n';

export function createPlayerSetup(
	playerNames: string[],
	colors: string[],
	mode: 'tournament' | 'standard',
	isMultiplayer: boolean
): string {
	const numPlayersToShow = mode === 'tournament' ? colors.length : 2;

	return `
		<div class="space-y-4">
			${mode === 'tournament' ? `
				<div class="flex items-center justify-between">
					<h3 class="${typography.body} text-lg text-white ${effects.textShadow.medium}">${escapeHtml(t('gameConfig.numPlayers'))}</h3>
					${colors.length < 6 ? `
						<button
							type="button"
							id="add-player-btn"
							class="border-2 border-white/50 text-white py-2 px-4 rounded-lg ${typography.body} text-xs ${effects.transition.all} hover:bg-white/10"
						>
							+ ${escapeHtml(t('gameConfig.addPlayer') || 'Add Player')}
						</button>
					` : ''}
				</div>
				<div class="text-white/80 text-sm mb-2">
					Current: ${colors.length} players (max 6)
				</div>
			` : ''}

			<div class="flex flex-col gap-3">
				${colors.slice(0, numPlayersToShow).map((color, index) => `
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
						${!isMultiplayer ? `
							<div>
								<label class="block text-white text-sm mb-2">
									${escapeHtml(t('gameConfig.playerName', { num: index + 1 }))}
								</label>
								<input
									type="text"
									id="player-${index}-input"
									value="${playerNames[index] ? escapeHtml(playerNames[index]) : ''}"
									placeholder="Player ${index + 1}"
									class="w-full py-2 px-4 bg-black/60 border-2 border-white/30 rounded-lg text-white placeholder-gray-400 focus:border-white/60 focus:outline-none focus:shadow-[0_0_10px_rgba(255,255,255,0.3)] ${typography.body}"
								/>
							</div>
						` : ''}
						<div class="flex items-center gap-2">
							<div class="flex-1">
								<label class="block text-white text-sm mb-2">
									${isMultiplayer ? `Player ${index + 1}` : 'Paddle'} Color
								</label>
								<input
									type="color"
									id="paddle-color-${index}-input"
									value="${escapeHtml(color)}"
									class="w-full h-12 rounded border-2 border-white/40 cursor-pointer bg-black/40"
								/>
							</div>
							${mode === 'tournament' && colors.length > 2 ? `
								<button
									type="button"
									class="remove-player-btn border-2 border-red-500/80 text-red-400 py-2 px-3 rounded-lg ${typography.body} text-xs ${effects.transition.all} hover:bg-red-500/20 mt-6"
									data-player-index="${index}"
								>
									✕
								</button>
							` : ''}
						</div>
					</div>
				`).join('')}
			</div>
		</div>
	`;
}

export function setupPlayerSetup(
	container: HTMLElement,
	playerNames: string[],
	colors: string[],
	mode: 'tournament' | 'standard',
	isMultiplayer: boolean,
	onNameChange: (index: number, name: string) => void,
	onColorChange: (index: number, color: string) => void,
	onAddPlayer: () => void,
	onRemovePlayer: (index: number) => void
): void {
	setTimeout(() => {
		// Player name inputs (local games only)
		if (!isMultiplayer) {
			playerNames.forEach((_, index) => {
				const input = container.querySelector(`#player-${index}-input`) as HTMLInputElement;
				if (input) {
					input.addEventListener('input', () => {
						onNameChange(index, input.value.trim());
					});
				}
			});
		}

		// Color inputs
		const numColorsToHandle = mode === 'tournament' ? colors.length : 2;
		for (let index = 0; index < numColorsToHandle; index++) {
			const colorInput = container.querySelector(`#paddle-color-${index}-input`) as HTMLInputElement;
			if (colorInput) {
				colorInput.addEventListener('input', () => {
					onColorChange(index, colorInput.value);
				});
			}
		}

		// Add player button (tournament only)
		if (mode === 'tournament') {
			const addBtn = container.querySelector('#add-player-btn');
			if (addBtn) {
				addBtn.addEventListener('click', (e) => {
					e.preventDefault();
					onAddPlayer();
				});
			}

			// Remove player buttons
			const removeBtns = container.querySelectorAll('.remove-player-btn');
			removeBtns.forEach(btn => {
				btn.addEventListener('click', (e) => {
					e.preventDefault();
					const index = parseInt((e.target as HTMLElement).getAttribute('data-player-index') || '0');
					onRemovePlayer(index);
				});
			});
		}
	}, 0);
}
