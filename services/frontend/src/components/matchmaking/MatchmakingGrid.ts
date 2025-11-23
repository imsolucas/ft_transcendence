import { createPlayerCard } from './PlayerCard';
import { createVersusDisplay } from './VersusDisplay';
import type { PlayerCardData } from './PlayerCard';

/**
 * Creates the matchmaking grid layout with player cards and VS display
 * Follows the lobby page modular pattern with proper null handling
 */
export function createMatchmakingGrid(
	currentUser: PlayerCardData | null,
	opponent: PlayerCardData | null,
	status: 'searching' | 'found'
): string {
	try {
		const playerStatus = status === 'found' ? 'found' : 'active';

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

				<!-- Opponent -->
				<div class="w-full lg:w-96">
					${opponent
						? createPlayerCard(opponent, false, 'found')
						: createPlayerCard(null, false, 'searching')
					}
				</div>
			</div>
		`;
	} catch (error) {
		console.error('Error creating matchmaking grid:', error);
		return '<div class="text-white text-center">Error loading matchmaking grid</div>';
	}
}