export const __speed__ = 5;
export const __friction__ = 0.1;
export const PLAYER_HEIGHT = 150
export const PLAYER_WIDTH = 25
export const BALL_SIZE = 25

export interface Vector {
    x: number,
    y: number
}

export interface Circle{
    radius: number;
}

export interface Rectangle{
    width: number;
    height: number;
}

export interface Border{
    top: number;
    bottom: number;
    left: number;
    right: number;
}

enum GAME_STATE {
    PAUSE,
    PLAYING,
    PLAYER_SCORE,
    GAME_END,
    MENU
}