import { t } from '../../i18n';
import { escapeHtml } from '../../utils/sanitize';
import { typography, effects, gradients } from '../../styles/theme';

export function createLobbyOptions(): string {
	return `
		<div class="flex flex-col gap-6 max-w-3xl mx-auto">
			<!-- Random Play -->
			<button
				id="random-play-btn"
				class="w-full border-2 border-white/50 text-white py-6 px-6 rounded-lg ${typography.button} ${effects.transition.all} hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] ${gradients.buttons.randomPlay} relative overflow-hidden"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<div class="text-3xl">🎲</div>
						<div class="text-left">
							<div class="mb-1 ${effects.textShadow.heavy}">${escapeHtml(t('multiplayer.randomPlay'))}</div>
							<div class="${typography.body} text-sm text-white/80 ${effects.textShadow.medium}">${escapeHtml(t('multiplayer.randomPlayDesc'))}</div>
						</div>
					</div>
					<div class="text-2xl">→</div>
				</div>
			</button>

			<!-- Create Lobby -->
			<button
				id="create-lobby-btn"
				class="w-full border-2 border-white/50 text-white py-6 px-6 rounded-lg ${typography.button} ${effects.transition.all} hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] ${gradients.buttons.createLobby} relative overflow-hidden"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-4">
						<div class="text-3xl">➕</div>
						<div class="text-left">
							<div class="mb-1 ${effects.textShadow.heavy}">${escapeHtml(t('multiplayer.createLobby'))}</div>
							<div class="${typography.body} text-sm text-white/80 ${effects.textShadow.medium}">${escapeHtml(t('multiplayer.createLobbyDesc'))}</div>
						</div>
					</div>
					<div class="text-2xl">→</div>
				</div>
			</button>

			<!-- Join Lobby -->
			<div class="w-full border-2 border-white/40 bg-black/40 backdrop-blur-md rounded-lg p-6">
				<div class="mb-4">
					<div class="flex items-center gap-4 mb-2">
						<div class="text-3xl">🔗</div>
						<div class="${typography.button} text-white ${effects.textShadow.heavy}">
							${escapeHtml(t('multiplayer.joinLobby'))}
						</div>
					</div>
					<div class="${typography.body} text-sm text-white/80 ml-12 ${effects.textShadow.medium}">
						${escapeHtml(t('multiplayer.joinLobbyDesc'))}
					</div>
				</div>
				<div class="flex gap-2">
					<input
						type="text"
						id="lobby-id-input"
						placeholder="${escapeHtml(t('multiplayer.enterGameId'))}"
						class="flex-1 py-3 px-4 bg-black/60 border-2 border-white/30 rounded-lg text-white placeholder-gray-400 focus:border-white/60 focus:outline-none focus:shadow-[0_0_10px_rgba(255,255,255,0.3)] ${typography.body}"
					/>
					<button
						id="join-lobby-btn"
						class="border-2 border-white/50 text-white py-3 px-8 rounded-lg ${typography.button} ${effects.transition.all} hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] ${gradients.buttons.joinLobby}"
					>
						${escapeHtml(t('multiplayer.join'))}
					</button>
				</div>
			</div>
		</div>

		<!-- Back Button -->
		<div class="text-center mt-12">
			<button
				id="back-btn"
				class="border-2 border-white/30 text-white py-3 px-8 rounded-lg ${typography.button} ${effects.transition.all} hover:border-white/60 bg-black/40"
			>
				${escapeHtml(t('gameConfig.back'))}
			</button>
		</div>
	`;
}

export function setupLobbyOptions(
	container: HTMLElement,
	onRandom: () => void,
	onCreate: () => void,
	onJoin: (lobbyId: string) => void,
	onBack: () => void
): void {
	setTimeout(() => {
		const btnRandom = container.querySelector('#random-play-btn');
		const btnCreate = container.querySelector('#create-lobby-btn');
		const btnJoin = container.querySelector('#join-lobby-btn');
		const inputLobbyId = container.querySelector('#lobby-id-input') as HTMLInputElement;
		const btnBack = container.querySelector('#back-btn');

		if (!btnRandom || !btnCreate || !btnJoin || !inputLobbyId || !btnBack) {
			console.warn('Lobby option elements not found in DOM');
			return;
		}

		btnRandom.addEventListener('click', (e) => {
			e.preventDefault();
			try {
				onRandom();
			} catch (error) {
				console.error('Error in random play handler:', error);
			}
		});

		btnCreate.addEventListener('click', (e) => {
			e.preventDefault();
			try {
				onCreate();
			} catch (error) {
				console.error('Error in create lobby handler:', error);
			}
		});

		btnJoin.addEventListener('click', (e) => {
			e.preventDefault();
			const lobbyId = inputLobbyId.value.trim();
			if (!lobbyId) {
				alert('Please enter a game ID');
				return;
			}
			try {
				onJoin(lobbyId);
			} catch (error) {
				console.error('Error in join lobby handler:', error);
			}
		});

		// Allow Enter key to join lobby
		inputLobbyId.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				(btnJoin as HTMLButtonElement).click();
			}
		});

		btnBack.addEventListener('click', (e) => {
			e.preventDefault();
			try {
				onBack();
			} catch (error) {
				console.error('Error in back handler:', error);
			}
		});
	}, 0);
}
