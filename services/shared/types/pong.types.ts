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

// ---------------------------------------------------------------- Bracket tournaments
// Single elimination for 3 to 8 players; byes fill the bracket to 4 or 8 slots. The game
// server owns the bracket and broadcasts the whole TournamentState on every change.

/** A registered player, snapshotted when they join (they stay listed after leaving). */
export interface TournamentPlayer {
    id: string;
    name: string;
    picture?: string;
    /** left the room or forfeited out: their later matches are walkovers */
    withdrawn: boolean;
}

/** pending: players not known yet · scheduled: both known · live: ready check or playing · done */
export type BracketMatchStatus = 'pending' | 'scheduled' | 'live' | 'done';
/** played to the end · forfeit (left / disconnected / no-show mid-match) · walkover (opponent gone) · bye */
export type BracketMatchResult = 'played' | 'forfeit' | 'walkover' | 'bye';

export interface BracketMatch {
    /** "r<round>m<index>", both 0-based */
    id: string;
    round: number;
    index: number;
    /** player ids; null = bye, empty slot or not decided yet (see status) */
    p1: string | null;
    p2: string | null;
    winnerId: string | null;
    /** [p1, p2] when a game was played (also for a mid-match forfeit) */
    scores: [number, number] | null;
    status: BracketMatchStatus;
    result: BracketMatchResult | null;
}

export type TournamentPhase = 'registration' | 'ready' | 'playing' | 'between' | 'finished';

export interface TournamentState {
    roomId: string;
    phase: TournamentPhase;
    /** registration capacity (4, 6 or 8) */
    size: number;
    hostId: string;
    players: TournamentPlayer[];
    /** rounds[0] = first round … last = final; empty during registration */
    rounds: BracketMatch[][];
    /** the match being readied or played */
    currentMatchId: string | null;
    /** players of the current match who pressed ready */
    readyIds: string[];
    /** ms epoch: a player not ready by then forfeits the current match */
    readyDeadline: number | null;
    championId: string | null;
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