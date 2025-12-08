import { escapeHtml } from '../../utils/sanitize';
import { typography } from '../../styles/theme';

export interface PlayerCardData {
	id: string;
	username: string;
	picture?: string;
	level?: number;
	wins?: number;
	losses?: number;
	winRate?: string;
}

export function createPlayerCard(
	player: PlayerCardData | null,
	isCurrentUser: boolean,
	status: 'active' | 'searching' | 'found'
): string {
	if (!player && status === 'searching') {
		return `
			<div class="player-card bg-gray-900/40 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-600/30 shadow-[0_0_20px_rgba(100,100,100,0.1)]">
				<div class="text-center">
					<div class="relative mb-4">
						<div class="w-24 h-24 rounded-full border-4 border-gray-600 bg-gray-800 mx-auto flex items-center justify-center">
							<div class="w-8 h-8 border-2 border-gray-600 rounded-full animate-spin"></div>
						</div>
					</div>
					<h3 class="${typography.button} text-lg text-gray-500 mb-2">OPPONENT</h3>
					<p class="${typography.body} text-gray-400 text-xl mb-2">Searching...</p>
					<div class="grid grid-cols-3 gap-2 text-xs">
						<div class="text-center">
							<div class="text-gray-500">LVL</div>
							<div class="text-gray-400">-</div>
						</div>
						<div class="text-center">
							<div class="text-gray-500">WINS</div>
							<div class="text-gray-400">-</div>
						</div>
						<div class="text-center">
							<div class="text-gray-500">RATE</div>
							<div class="text-gray-400">-</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	if (!player) {
		return '';
	}

	const label = isCurrentUser ? 'YOU' : 'OPPONENT';

	return `
		<div class="player-card bg-black/40 backdrop-blur-md rounded-2xl p-6 border-2 border-white/40 transition-all">
			<div class="text-center">
				<div class="relative mb-4">
					<img
						src="${escapeHtml(player.picture || '/images/pong.png')}"
						alt="${escapeHtml(label)} Avatar"
						class="w-24 h-24 rounded-full border-4 border-white/60 object-cover mx-auto"
						onerror="this.src='/images/pong.png'"
					>
					<div class="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
						<div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
					</div>
				</div>
				<h3 class="${typography.button} text-lg text-white ${typography.weights.bold} mb-2">${escapeHtml(label)}</h3>
				<p class="${typography.body} text-white text-xl mb-2 ${typography.weights.semibold}">${escapeHtml(player.username)}</p>
				<div class="grid grid-cols-3 gap-2 text-xs">
					<div class="text-center">
						<div class="text-white/80 ${typography.weights.semibold}">LVL</div>
						<div class="text-white">${player.level || 1}</div>
					</div>
					<div class="text-center">
						<div class="text-white/80 ${typography.weights.semibold}">WINS</div>
						<div class="text-white">${player.wins || 0}</div>
					</div>
					<div class="text-center">
						<div class="text-white/80 ${typography.weights.semibold}">RATE</div>
						<div class="text-white">${escapeHtml(player.winRate || '0%')}</div>
					</div>
				</div>
			</div>
		</div>
	`;
}
