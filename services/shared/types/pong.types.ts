import type { Vector } from "../game-engine/components/Vector.ts";
import type { StateName } from "../game-engine/states/BaseGameState.ts";

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
    /** current paddle heights (power-ups change them); absent = the configured size */
    paddleHeights?: [number, number];
    /** the power-up on the court, if any */
    powerUp?: PowerUpView | null;
    isPlaying: boolean;
    lastUpdate: number
}

export interface TournamentState {
    kingId: string;
    kingName: string;
    challengerId: string;
    challengerName: string;
    queue: Array<{
        playerId: string;
        playerName: string;
    }>
    scores: Map<string, number> | Record<string, number>;
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
    numPlayers?: number; // For tournament mode
    /** opt-in power-ups (local / vs-AI games) */
    powerUps?: boolean;
    /** seed for power-up randomness (same seed + inputs = same game) */
    seed?: number;
}

export type PowerUpKind = "grow" | "shrink" | "fast";
export interface PowerUpView {
    x: number;
    y: number;
    kind: PowerUpKind;
}