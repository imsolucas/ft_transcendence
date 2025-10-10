export namespace constants {
    export const PLAYER_SPEED = 600;
    export const PLAYER_FRICTION = 0.1;
    export const PLAYER_HEIGHT = 150
    export const PLAYER_WIDTH = 25
    export const BALL_SIZE = 25
    export const BALL_SPEED_MAX = 800
    export const BALL_SPEED_MIN = 700
    export const WIN_POINT = 2
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