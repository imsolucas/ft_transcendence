import { escapeHtml } from '../../utils/sanitize';
import { typography } from '../../styles/theme';

export function createGameSettings(
	bgColorLabel: string,
	bgColorValue: string,
	pointsLabel: string,
	pointsValue: number,
	lobbyLabel: string | null,
	publicLabel: string | null,
	privateLabel: string | null,
	isPrivate: boolean,
	isMultiplayer: boolean
): string {
	return `
		<!-- Background Color -->
		<div class="space-y-4">
			<h3 class="${typography.body} text-lg text-white drop-shadow-md">${escapeHtml(bgColorLabel)}</h3>
			<input
				type="color"
				id="bg-color-input"
				value="${escapeHtml(bgColorValue)}"
				class="w-full h-12 rounded border-2 border-white/40 cursor-pointer bg-black/40"
			/>
		</div>

		<!-- Points to Win -->
		<div class="space-y-4">
			<label class="block ${typography.body} text-lg text-white drop-shadow-md">${escapeHtml(pointsLabel)}</label>
			<input
				type="number"
				id="points-input"
				min="1"
				max="50"
				value="${pointsValue}"
				class="w-full py-2 px-4 bg-black/60 border-2 border-white/30 rounded-lg text-white focus:border-white/60 focus:outline-none focus:shadow-[0_0_10px_rgba(255,255,255,0.3)] ${typography.body}"
			/>
		</div>

		${isMultiplayer && lobbyLabel && publicLabel && privateLabel ? `
			<div class="space-y-4">
				<label class="block ${typography.body} text-lg text-white drop-shadow-md">${escapeHtml(lobbyLabel)}</label>
				<div class="flex gap-4">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="lobby-type"
							value="public"
							${!isPrivate ? 'checked' : ''}
							class="w-5 h-5 text-indigo-600 focus:ring-indigo-600"
						/>
						<span class="text-white">${escapeHtml(publicLabel)}</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="lobby-type"
							value="private"
							${isPrivate ? 'checked' : ''}
							class="w-5 h-5 text-indigo-600 focus:ring-indigo-600"
						/>
						<span class="text-white">${escapeHtml(privateLabel)}</span>
					</label>
				</div>
			</div>
		` : ''}
	`;
}

export function setupGameSettings(
	container: HTMLElement,
	isMultiplayer: boolean,
	onBgColorChange: (color: string) => void,
	onPointsChange: (points: number) => void,
	onLobbyTypeChange: (isPrivate: boolean) => void
): void {
	setTimeout(() => {
		const bgColorInput = container.querySelector('#bg-color-input') as HTMLInputElement;
		const pointsInput = container.querySelector('#points-input') as HTMLInputElement;

		if (!bgColorInput || !pointsInput) {
			console.warn('Game settings controls not found in DOM');
			return;
		}

		bgColorInput.addEventListener('input', () => {
			onBgColorChange(bgColorInput.value);
		});

		pointsInput.addEventListener('input', () => {
			const points = parseInt(pointsInput.value) || 5;
			onPointsChange(points);
		});

		if (isMultiplayer) {
			const lobbyTypeInputs = container.querySelectorAll('input[name="lobby-type"]');
			lobbyTypeInputs.forEach(input => {
				input.addEventListener('change', (e) => {
					const isPrivate = (e.target as HTMLInputElement).value === 'private';
					onLobbyTypeChange(isPrivate);
				});
			});
		}
	}, 0);
}
