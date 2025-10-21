export namespace constants {
    export const PLAYER_SPEED = 10;
    export const PLAYER_FRICTION = 0.1;
    export const PLAYER_HEIGHT = 15
    export const PLAYER_WIDTH = 10
    export const ASPECT_RATIO = 16 / 10
    export const COURT_HEIGHT = 100
    export const COURT_WIDTH = 160
    export const BALL_SIZE = 25
    export const BALL_SPEED_MAX = 0.8
    export const BALL_SPEED_MIN = 0.7
    export const WIN_POINT = 2
    export var SCALE_X = 0;
    export var SCALE_Y = 0;
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