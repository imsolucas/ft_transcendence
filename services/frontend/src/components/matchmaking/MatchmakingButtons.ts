import { typography, effects, gradients } from '../../styles/theme';
import { escapeHtml } from '../../utils/sanitize';

export function createMatchmakingButtons(type: 'cancel' | 'ready' | 'retry'): string {
	const buttonConfigs = {
		cancel: {
			id: 'cancel-matchmaking',
			text: 'CANCEL SEARCH',
			className: 'border-2 border-white/30 text-white py-3 px-8 rounded-lg hover:border-white/60 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] bg-black/40'
		},
		ready: {
			id: 'ready-to-play',
			text: 'READY TO PLAY',
			className: `border-2 border-white/50 text-white py-3 px-8 rounded-lg hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] ${gradients.buttons.createLobby} pulse-glow`
		},
		retry: {
			id: 'retry-matchmaking',
			text: 'TRY AGAIN',
			className: `border-2 border-white/50 text-white py-3 px-8 rounded-lg hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] ${gradients.buttons.createLobby}`
		}
	};

	const config = buttonConfigs[type];

	return `
		<div class="text-center mt-12">
			<button
				id="${config.id}"
				class="${config.className} ${typography.button} text-sm ${effects.transition.all}"
			>
				${escapeHtml(config.text)}
			</button>
		</div>
	`;
}

export function setupMatchmakingButtons(
	container: HTMLElement,
	type: 'cancel' | 'ready' | 'retry',
	onClick: () => void
): void {
	setTimeout(() => {
		const buttonIds = {
			cancel: '#cancel-matchmaking',
			ready: '#ready-to-play',
			retry: '#retry-matchmaking'
		};

		const button = container.querySelector(buttonIds[type]);
		if (button) {
			button.addEventListener('click', (e) => {
				e.preventDefault();
				try {
					onClick();
				} catch (error) {
					console.error(`Error in ${type} button handler:`, error);
				}
			});
		} else {
			console.warn(`${type} button not found in DOM`);
		}
	}, 0);
}
