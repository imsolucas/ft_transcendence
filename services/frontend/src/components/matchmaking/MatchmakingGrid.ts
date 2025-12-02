import { createPlayerCard } from './PlayerCard';
import { createVersusDisplay } from './VersusDisplay';
import type { PlayerCardData } from './PlayerCard';

/**
 * Creates the matchmaking grid layout with player cards and VS display
 * Supports multiple opponents for tournament mode
 * If opponents array is empty, displays searching state
 */
export function createMatchmakingGrid(
	currentUser: PlayerCardData | null,
	opponents: PlayerCardData[],
	status: 'searching' | 'found'
): string {
	try {
		const playerStatus = status === 'found' ? 'found' : 'active';

		const playerCards = opponents.length === 0
					? createPlayerCard(null, false, 'searching')
					: opponents.map(opponent => `
						<div class="w-full lg:w-96">
							${createPlayerCard(opponent, false, 'found')}
						</div>
					`).join('')

		// If no opponents, show searching layout
		return `
				<div class="flex flex-col lg:flex-row gap-6 items-stretch justify-center mx-auto px-4">
					<!-- Current Player -->
					<div class="w-full lg:w-96">
						${createPlayerCard(currentUser, true, playerStatus)}
					</div>

					<!-- VS Area -->
					<div class="w-full lg:w-auto lg:min-w-[300px] flex items-center justify-center">
						${createVersusDisplay(status)}
					</div>

					<!-- Searching Opponent -->
					<div class="w-full lg:w-96">
						${playerCards}
					</div>
				</div>
			`;
	} catch (error) {
		console.error('Error creating matchmaking grid:', error);
		return '<div class="text-white text-center">Error loading matchmaking grid</div>';
	}
}