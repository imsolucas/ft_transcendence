import { escapeHtml } from '../../utils/sanitize';
import { typography, effects } from '../../styles/theme';

export function createBallControl(
	colorLabel: string,
	speedLabel: string,
	colorValue: string,
	speedValue: number
): string {
	return `
		<div class="space-y-4">
			<h3 class="${typography.body} text-lg text-white ${effects.textShadow.medium}">${escapeHtml(colorLabel)}</h3>
			<div class="flex items-center gap-4">
				<input
					type="color"
					id="ball-color-input"
					value="${escapeHtml(colorValue)}"
					class="w-20 h-12 rounded border-2 border-white/40 cursor-pointer bg-black/40"
				/>
				<div class="flex-1">
					<label class="block text-white text-sm mb-2">${escapeHtml(speedLabel)}</label>
					<input
						type="range"
						id="ball-speed-input"
						min="0"
						max="100"
						value="${speedValue}"
						class="w-full accent-indigo-600"
					/>
					<div class="text-right text-white/90 text-sm mt-1" id="ball-speed-value">${speedValue}</div>
				</div>
			</div>
		</div>
	`;
}

export function setupBallControl(
	container: HTMLElement,
	onColorChange: (color: string) => void,
	onSpeedChange: (speed: number) => void
): void {
	setTimeout(() => {
		const colorInput = container.querySelector('#ball-color-input') as HTMLInputElement;
		const speedInput = container.querySelector('#ball-speed-input') as HTMLInputElement;
		const speedValue = container.querySelector('#ball-speed-value');

		if (!colorInput || !speedInput || !speedValue) {
			console.warn('Ball controls not found in DOM');
			return;
		}

		colorInput.addEventListener('input', () => {
			onColorChange(colorInput.value);
		});

		speedInput.addEventListener('input', () => {
			const speed = parseInt(speedInput.value);
			speedValue.textContent = String(speed);
			onSpeedChange(speed);
		});
	}, 0);
}
