export interface GameState {
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
    up: boolean
    down: boolean,
    left: boolean,
    right: boolean
}