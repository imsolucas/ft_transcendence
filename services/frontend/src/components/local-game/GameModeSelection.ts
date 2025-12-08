import { t } from '../../i18n';
import { escapeHtml } from '../../utils/sanitize';
import { typography, effects, gradients } from '../../styles/theme';

export function createGameModeSelection(): string {
	return `
		<div class="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
			<!-- 1v1 Mode -->
			<button
				id="one-vs-one-btn"
				class="flex-1 border-2 border-white/50 text-white py-8 px-6 rounded-lg ${typography.button} ${effects.transition.all} hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] ${gradients.buttons.oneVsOne} relative overflow-hidden"
			>
				<div class="text-4xl mb-4">⚔️</div>
				<div class="mb-2 ${effects.textShadow.heavy}">${escapeHtml(t('localGame.oneVsOne'))}</div>
				<div class="${typography.body} text-white/80 ${effects.textShadow.medium}">${escapeHtml(t('localGame.oneVsOneDesc'))}</div>
			</button>

			<!-- Tournament Mode -->
			<button
				id="tournament-btn"
				class="flex-1 border-2 border-white/50 text-white py-8 px-6 rounded-lg ${typography.button} ${effects.transition.all} hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] ${gradients.buttons.tournament} relative overflow-hidden"
			>
				<div class="text-4xl mb-4">👑</div>
				<div class="mb-2 ${effects.textShadow.heavy}">${escapeHtml(t('localGame.tournament'))}</div>
				<div class="${typography.body} text-white/80 ${effects.textShadow.medium}">${escapeHtml(t('localGame.tournamentDesc'))}</div>
			</button>
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

export function setupGameModeSelection(
	container: HTMLElement,
	onSelect1v1: () => void,
	onSelectTournament: () => void,
	onBack: () => void
): void {
	setTimeout(() => {
		const btn1v1 = container.querySelector('#one-vs-one-btn');
		const btnTournament = container.querySelector('#tournament-btn');
		const btnBack = container.querySelector('#back-btn');

		if (!btn1v1 || !btnTournament || !btnBack) {
			console.warn('Game mode buttons not found in DOM');
			return;
		}

		btn1v1.addEventListener('click', onSelect1v1);
		btnTournament.addEventListener('click', onSelectTournament);
		btnBack.addEventListener('click', onBack);
	}, 0);
}
