export interface PaddleConfig {
	color: string;
	speed: number;
}

export interface BallConfig {
	color: string;
	speed: number;
}

export interface GameConfig {
	paddleConfig: PaddleConfig;
	ballConfig: BallConfig;
	playerNames: string[];
	backgroundColor: string;
	pointsToWin: number;
	isPrivate: boolean;
	mode: 'tournament' | 'standard';
	numPlayers?: number; // For tournament mode
	lobbyId?: string; // For multiplayer lobbies
}

