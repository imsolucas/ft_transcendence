export interface PongGameState {
	ball: {
		x: number;
		y: number;
		vx: number;
		vy: number;
		radius: number;
	};
	paddles: [
		{ y: number; height: number; width: number; }, // left player
		{ y: number; height: number; width: number; }  // right player
	];
	scores: [number, number]; // [left, right]
	isPlaying: boolean;
	lastUpdate: number;
}
