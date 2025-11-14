import type { Vector } from "../game-engine/components/Vector.js";
import type { StateName } from "../game-engine/states/BaseGameState.js";

export interface GameState {
    name: StateName
    ball: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        width: number;
        height: number
    };
    paddles: [
        {x: number, y: number;}, // left player
        {x: number, y: number;}  // right player
    ];
    scores: number[]; // [left, right]
    isPlaying: boolean;
    lastUpdate: number
}

export interface PlayerInputs {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    action_1: boolean;
    action_2: boolean;
}

export interface PaddleConfig {
    color: string;
    speed: number;
    size?: Vector
    friction?: number
}

export interface BallConfig {
    color: string;
    speed: number;
    size?: Vector;
}

export interface GameConfig {
    paddleConfig: PaddleConfig;
    ballConfig: BallConfig;
    courtSize?: Vector
    playerNames: string[];
    backgroundColor: string;
    pointsToWin: number;
    isPrivate: boolean;
    mode: 'tournament' | 'standard';
}