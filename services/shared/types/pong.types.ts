export interface GameState {
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

export interface Vector {
    x: number,
    y: number
}

export interface Border{
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface CollisionResult {
    isColliding: boolean;
    side?: "top" | "bottom" | "left" | "right";
    position?: Border;
}

export interface PlayerInputs {
    up: boolean,
    down: boolean,
    left: boolean,
    right: boolean,
}

export enum eGameState {
    PAUSE,
    START_ROUND,
    STARTING_ROUND,
    PLAYING,
    PLAYER_SCORE,
    GAME_END,
    MENU
}

