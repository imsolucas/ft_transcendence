import { escapeHtml } from '../../utils/sanitize';
import { typography, effects } from '../../styles/theme';

export function createPaddleSpeedControl(label: string, value: number): string {
	return `
		<div class="space-y-4">
			<h3 class="${typography.body} text-lg text-white ${effects.textShadow.medium}">${escapeHtml(label)}</h3>
			<div class="flex items-center gap-4">
				<div class="flex-1">
					<input
						type="range"
						id="paddle-speed-input"
						min="1"
						max="10"
						value="${value}"
						class="w-full accent-indigo-600"
					/>
					<div class="text-right text-white/90 text-sm mt-1" id="paddle-speed-value">${value}</div>
				</div>
			</div>
		</div>
	`;
}

export function setupPaddleSpeedControl(
	container: HTMLElement,
	onSpeedChange: (speed: number) => void
): void {
	setTimeout(() => {
		const paddleSpeedInput = container.querySelector('#paddle-speed-input') as HTMLInputElement;
		const paddleSpeedValue = container.querySelector('#paddle-speed-value');

		if (!paddleSpeedInput || !paddleSpeedValue) {
			console.warn('Paddle speed controls not found in DOM');
			return;
		}

		paddleSpeedInput.addEventListener('input', () => {
			const speed = parseInt(paddleSpeedInput.value);
			paddleSpeedValue.textContent = String(speed);
			onSpeedChange(speed);
		});
	}, 0);
}
