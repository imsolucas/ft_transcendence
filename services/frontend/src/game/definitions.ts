export namespace constants {
    export const PLAYER_SPEED = 9;
    export const PLAYER_FRICTION = 0.1;
    export const PLAYER_HEIGHT = 150
    export const PLAYER_WIDTH = 100
    export const BALL_SIZE = 25
    export const BALL_SPEED = 25
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

export enum eGameState {
    PAUSE,
    START_ROUND,
    STARTING_ROUND,
    PLAYING,
    PLAYER_SCORE,
    GAME_END,
    MENU
}