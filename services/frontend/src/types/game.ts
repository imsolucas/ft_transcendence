export interface PaddleConfig {
	color: string;
	speed: number;
}

export interface BallConfig {
	color: string;
	speed: number;
}

export interface GameConfig {
	paddleConfig: PaddleConfig | PaddleConfig[]; // Single config for local, array for multiplayer (per player)
	ballConfig: BallConfig;
	playerNames: string[]; // Only for local games
	backgroundColor: string;
	pointsToWin: number;
	isPrivate: boolean;
	mode: 'tournament' | 'standard';
	numPlayers?: number; // For tournament mode
	lobbyId?: string; // For multiplayer lobbies
}

