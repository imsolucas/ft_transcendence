import { escapeHtml } from '../../utils/sanitize';
import { typography } from '../../styles/theme';
import { t } from '../../i18n';

export function createPlayerNames(playerNames: string[]): string {
	return `
		<div class="space-y-4" id="player-names-container">
			<h3 class="${typography.body} text-lg text-white drop-shadow-md">Player Names</h3>
			${playerNames.map((name, index) => `
				<div>
					<label class="block text-white text-sm mb-2">${escapeHtml(t('gameConfig.playerName', { num: index + 1 }))}</label>
					<input
						type="text"
						id="player-${index}-input"
						value="${escapeHtml(name)}"
						placeholder="Player ${index + 1}"
						class="w-full py-2 px-4 bg-black/60 border-2 border-white/30 rounded-lg text-white placeholder-gray-400 focus:border-white/60 focus:outline-none focus:shadow-[0_0_10px_rgba(255,255,255,0.3)] ${typography.body}"
					/>
				</div>
			`).join('')}
		</div>
	`;
}

export function setupPlayerNames(
	container: HTMLElement,
	playerNames: string[],
	onNameChange: (index: number, name: string) => void
): void {
	setTimeout(() => {
		playerNames.forEach((_, index) => {
			const input = container.querySelector(`#player-${index}-input`) as HTMLInputElement;
			if (input) {
				input.addEventListener('input', () => {
					onNameChange(index, input.value.trim());
				});
			}
		});
	}, 0);
}
