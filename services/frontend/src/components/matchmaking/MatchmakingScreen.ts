import { getCurrentUser } from '../../utils/auth-script';
import { escapeHtml } from '../../utils/sanitize';
import { typography, gradients } from '../../styles/theme';
import { injectMatchmakingStyles } from './MatchmakingStyles';
import { createMatchmakingHeader } from './MatchmakingHeader';
import { createMatchmakingButtons, setupMatchmakingButtons } from './MatchmakingButtons';
import { createMatchmakingGrid } from './MatchmakingGrid';

// Types for matchmaking
export interface MatchmakingPlayer {
	id: string;
	username: string;
	picture?: string;
	level?: number;
	wins?: number;
	losses?: number;
	winRate?: string;
}

export interface MatchmakingState {
	status: 'searching' | 'found' | 'ready' | 'error';
	currentUser: MatchmakingPlayer | null;
	opponents: MatchmakingPlayer[];
	matchId?: string;
	error?: string;
}

// WebSocket integration interface
export interface MatchmakingEvents {
	onMatchFound: (opponent: MatchmakingPlayer, matchId: string) => void;
	onMatchReady: (matchId: string) => void;
	onMatchError: (error: string) => void;
	onCancel: () => void;
}

export function MatchmakingScreen(events?: MatchmakingEvents): HTMLElement {
	const container = document.createElement('div');
	container.className = `relative w-full min-h-screen ${gradients.pageBackground} overflow-y-auto`;
	container.style.maxHeight = '100vh';
	container.style.overflowY = 'auto';

	// Inject styles once
	injectMatchmakingStyles();

	// State management
	let matchmakingState: MatchmakingState = {
		status: 'searching',
		currentUser: null,
		opponents: []
	};

	// Initialize current user
	const initializeCurrentUser = async () => {
		try {
			const currentUser = await getCurrentUser();
			if (currentUser) {
				matchmakingState.currentUser = {
					id: currentUser.id,
					username: currentUser.username,
					picture: currentUser.picture,
					level: 10, // Mock data - should come from backend
					wins: 15,
					losses: 5,
					winRate: '75%'
				};
				render();
			}
		} catch (error) {
			console.error('Error initializing current user:', error);
			setError('Failed to load user data');
		}
	};

	// Render functions
	const renderSearching = (): string => {
		return `
			<div class="relative w-full pb-8">
				<div class="container mx-auto px-4 py-8 flex flex-col">
					${createMatchmakingHeader('MATCHMAKING', 'Searching for opponent', 'searching')}
					${createMatchmakingGrid(matchmakingState.currentUser, matchmakingState.opponents, 'searching')}
					${createMatchmakingButtons('cancel')}
				</div>
			</div>
		`;
	};

	const renderMatchFound = (): string => {
		return `
			<div class="relative w-full pb-8">
				<div class="container mx-auto px-4 py-8 flex flex-col">
					${createMatchmakingHeader('OPPONENT FOUND!', 'Get ready to play', 'found')}
					${createMatchmakingGrid(matchmakingState.currentUser, matchmakingState.opponents, 'found')}
					${createMatchmakingButtons('ready')}
				</div>
			</div>
		`;
	};

	const renderError = (): string => {
		return `
			<div class="relative min-h-screen mt-8">
				<div class="container mx-auto px-4 py-8 h-full flex flex-col justify-center items-center">
					<div class="text-center">
						<h1 class="text-4xl md:text-6xl ${typography.weights.bold} mb-8 ${typography.fonts.primary} text-red-500">
							${escapeHtml('MATCHMAKING ERROR')}
						</h1>
						<p class="${typography.sizes.heroSubtitle} ${typography.fonts.primary} text-gray-300 mb-8">
							${escapeHtml(matchmakingState.error || 'Something went wrong')}
						</p>
						${createMatchmakingButtons('retry')}
					</div>
				</div>
			</div>
		`;
	};

	// Main render function
	const render = (): void => {
		try {
			switch (matchmakingState.status) {
				case 'searching':
					container.innerHTML = renderSearching();
					break;
				case 'found':
					container.innerHTML = renderMatchFound();
					break;
				case 'error':
					container.innerHTML = renderError();
					break;
				default:
					container.innerHTML = renderSearching();
			}
			setupEventListeners();
		} catch (error) {
			console.error('Error rendering matchmaking screen:', error);
			container.innerHTML = `
				<div class="text-center text-white p-8">
					<p class="${typography.subtitle}">Error loading matchmaking screen</p>
				</div>
			`;
		}
	};

	// Event listeners
	const setupEventListeners = (): void => {
		// Setup cancel button (searching state)
		setupMatchmakingButtons(container, 'cancel', () => {
			if (events?.onCancel) {
				events.onCancel();
			}
		});

		// Setup ready button (found state)
		setupMatchmakingButtons(container, 'ready', () => {
			if (matchmakingState.matchId && events?.onMatchReady) {
				events.onMatchReady(matchmakingState.matchId);
			}
		});

		// Setup retry button (error state)
		setupMatchmakingButtons(container, 'retry', () => {
			matchmakingState.status = 'searching';
			matchmakingState.opponents = [];
			matchmakingState.error = undefined;
			render();
		});
	};

	// Public methods for external control
	const updateState = (newState: Partial<MatchmakingState>): void => {
		matchmakingState = { ...matchmakingState, ...newState };
		render();
	};

	const addOpponent = (opponent: MatchmakingPlayer, matchId?: string): void => {
		if (!opponent) {
			console.error('Invalid opponent');
			return;
		}

		// Check if opponent already exists (prevent duplicates)
		const existingOpponent = matchmakingState.opponents.find(op => op.id === opponent.id);
		if (existingOpponent) {
			console.warn('Opponent already added:', opponent.id);
			return;
		}

		// Add opponent to the array
		matchmakingState.opponents.push(opponent);

		// Update match ID if provided
		if (matchId) {
			matchmakingState.matchId = matchId;
		}

		// Update status to 'found' if we have at least one opponent
		if (matchmakingState.opponents.length > 0) {
			matchmakingState.status = 'found';
		}

		render();

		// Trigger match found event for the first opponent
		if (matchmakingState.opponents.length === 1 && matchId) {
			try {
				events?.onMatchFound(opponent, matchId);
			} catch (error) {
				console.error('Error in onMatchFound callback:', error);
			}
		}
	};

	const removeOpponent = (): void => {
		matchmakingState.status = 'searching';
		matchmakingState.opponents = [];
		matchmakingState.matchId = undefined;
		render();
	};

	const removeOpponentById = (opponentId: string): void => {
		matchmakingState.opponents = matchmakingState.opponents.filter(op => op.id !== opponentId);

		// If no opponents left, go back to searching
		if (matchmakingState.opponents.length === 0) {
			matchmakingState.status = 'searching';
			matchmakingState.matchId = undefined;
		}

		render();
	};

	const removeOpponentByUsername = (username: string): void => {
		matchmakingState.opponents = matchmakingState.opponents.filter(op => op.username !== username);

		// If no opponents left, go back to searching
		if (matchmakingState.opponents.length === 0) {
			matchmakingState.status = 'searching';
			matchmakingState.matchId = undefined;
		}

		render();
	};

	const setError = (error: string): void => {
		matchmakingState.status = 'error';
		matchmakingState.error = error || 'An unknown error occurred';
		render();

		try {
			events?.onMatchError(error);
		} catch (err) {
			console.error('Error in onMatchError callback:', err);
		}
	};

	// Expose methods on the container for external access
	(container as any).updateState = updateState;
	(container as any).addOpponent = addOpponent;
	(container as any).removeOpponent = removeOpponent;
	(container as any).removeOpponentById = removeOpponentById;
	(container as any).removeOpponentByUsername = removeOpponentByUsername;
	(container as any).setError = setError;

	// Initialize and render
	initializeCurrentUser();

	return container;
}

// Export for backward compatibility
export { MatchmakingScreen as LoadingPong };
