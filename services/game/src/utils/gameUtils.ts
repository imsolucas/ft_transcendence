import type { GameState } from 'shared'

export function createInitialGameState() : GameState {
	return {
		ball:{
			x: 400,
			y: 400,
			vx: 0,
			vy: 0,
			radius: 10,
		},
		paddles: [
			{ y:250, height: 100, width: 10}, //left player
			{ y:250, height: 100, width: 10}
		],
		scores: [0, 0],
		isPlaying: true,
		lastUpdate: Date.now(),
	} ;
}