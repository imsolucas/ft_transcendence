// ---------------------------------------------------------------- Party mode (3–4 players)
// A square court; every player defends one side. The server runs PartyEngine and
// broadcasts a PartyState every tick (the same Broadcaster path, so spectators mirror it).

/** 0 = bottom, 1 = left, 2 = top, 3 = right (clockwise from the bottom). Seat i defends side i. */
export type PartySide = 0 | 1 | 2 | 3;

/**
 * `serving`: the ball waits at the centre (start, and a short pause after each life lost) ·
 * `playing` · `over`: one player (or nobody) left.
 */
export type PartyPhase = "serving" | "playing" | "over";

export interface PartyPaddleView {
	seat: number;
	side: PartySide;
	/**
	 * Paddle centre along its side, 0..court, in the defender's own frame: seen from their
	 * side (their side at the bottom of their screen), larger = further to their right.
	 */
	pos: number;
	lives: number;
	alive: boolean;
}

export interface PartyState {
	phase: PartyPhase;
	/** court edge length (square) */
	court: number;
	paddleLength: number;
	/** distance from the edge to the paddle face */
	paddleInset: number;
	/** size of the solid corner blocks */
	corner: number;
	/** one per seat (3 or 4); a side with no seat (3 players) is a wall */
	paddles: PartyPaddleView[];
	ball: { x: number; y: number; vx: number; vy: number; r: number };
	/** seconds until the next serve (phase "serving") */
	serveIn: number;
	/** seat the next (or current) serve goes to */
	serveTo: number | null;
	/** seats in the order they were knocked out */
	eliminated: number[];
	/** seat of the last player standing (phase "over"); null if nobody */
	winner: number | null;
	/** seat that lost the last life, for a short highlight */
	lastLoss: number | null;
	/** simulation steps since the start (for interpolation/debug) */
	step: number;
}

/** A seated party player; snapshotted at start, so a leaver stays listed. */
export interface PartyPlayer {
	id: string;
	name: string;
	picture?: string;
	seat: number;
}

/** Final placement: 1 = winner; knocked-out players rank by how long they lasted. */
export interface PartyStanding {
	id: string;
	name: string;
	seat: number;
	place: number;
	lives: number;
}
