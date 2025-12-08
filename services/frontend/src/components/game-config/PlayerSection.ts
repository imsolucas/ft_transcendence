import { escapeHtml } from '../../utils/sanitize';
import { typography, effects } from '../../styles/theme';
import { t } from '../../i18n';

export function createPlayerSection(
	title: string,
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
					${colors.length < 8 ? `
						<button
							type="button"
							id="add-player-btn"
							class="border-2 border-white/50 text-white py-2 px-4 rounded-lg ${typography.body} text-xs ${effects.transition.all} hover:bg-white/10"
						>
							+ ${escapeHtml(t('gameConfig.addPlayer') || 'Add Player')}
						</button>
					` : ''}
				</div>
				<div class="text-white/80 text-sm">
					Current: ${colors.length} players (max 8)
				</div>
			` : ''}

			<h3 class="${typography.body} text-lg text-white ${effects.textShadow.medium}">${escapeHtml(title)}</h3>
			<div class="flex flex-col gap-3">
				${colors.slice(0, numPlayersToShow).map((color, index) => `
					<div class="flex items-center gap-2">
						<label class="text-white text-sm w-24">
							${!isMultiplayer ? escapeHtml(t('gameConfig.playerName', { num: index + 1 })) : `Player ${index + 1}`}:
						</label>
						<input
							type="color"
							id="paddle-color-${index}-input"
							value="${escapeHtml(color)}"
							class="w-20 h-12 rounded border-2 border-white/40 cursor-pointer bg-black/40"
						/>
						${mode === 'tournament' && colors.length > 2 ? `
							<button
								type="button"
								class="remove-player-btn border-2 border-red-500/80 text-red-400 py-2 px-3 rounded-lg ${typography.body} text-xs ${effects.transition.all} hover:bg-red-500/20"
								data-player-index="${index}"
							>
								✕
							</button>
						` : ''}
					</div>
				`).join('')}
			</div>
		</div>
	`;
}

export function setupPlayerSection(
	container: HTMLElement,
	colors: string[],
	mode: 'tournament' | 'standard',
	_isMultiplayer: boolean,
	onColorChange: (index: number, color: string) => void,
	onAddPlayer: () => void,
	onRemovePlayer: (index: number) => void
): void {
	setTimeout(() => {
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
			addBtn?.addEventListener('click', (e) => {
				e.preventDefault();
				onAddPlayer();
			});

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
