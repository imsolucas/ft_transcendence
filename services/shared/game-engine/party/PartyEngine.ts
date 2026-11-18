import type { PlayerInputs } from "../../types/pong.types.ts";
import type { PartyPaddleView, PartyPhase, PartySide, PartyStanding, PartyState } from "../../types/party.types.ts";

/**
 * Party Pong for 3 or 4 players on a square court (no DOM, no Node: the server runs it and
 * the browser can too).
 *
 * - Seat i defends side i (0 bottom, 1 left, 2 top, 3 right). With 3 players side 3 is a wall.
 * - Each paddle slides along its side between two solid corner blocks; left/right input moves
 *   it in the defender's own frame, so every player has the same controls in a rotated view.
 * - Every player starts with LIVES lives and loses one when the ball leaves through their
 *   side. At 0 they are out and their side becomes a wall. The last player standing wins.
 * - The ball serves from the centre toward the next seat of a seeded shuffle bag (random, but
 *   every alive player is served once per round of the bag), and speeds up a little per hit.
 * - Fairness: equal paddle size and speed for all, a pause before every serve, and a re-serve
 *   if the ball stops reaching paddles (a rally can't stall between walls).
 *
 * Deterministic: the same seed and the same input sequence (per tick) give the same game. The
 * simulation runs fixed steps of STEP seconds whatever dt the caller passes.
 */
export namespace partyDefaults {
	export const COURT = 100;
	export const PADDLE_LENGTH = 20;
	export const PADDLE_THICKNESS = 2;
	/** distance from the edge to the paddle face */
	export const PADDLE_INSET = 4;
	export const PADDLE_SPEED = 75;
	export const CORNER = 8;
	export const BALL_R = 1.5;
	export const BALL_SPEED = 45;
	export const BALL_SPEED_MAX = 105;
	/** ×1.06 per paddle hit, capped at BALL_SPEED_MAX */
	export const SPEED_UP = 1.06;
	export const LIVES = 3;
	export const START_DELAY_S = 3;
	export const LOSS_PAUSE_S = 1.5;
	/** no paddle touch for this long: the ball is re-served (no life lost) */
	export const STALL_S = 8;
	export const STEP = 1 / 120;
	/** a long hiccup is not simulated in one go */
	export const MAX_DT = 0.25;
	export const MAX_BOUNCE = (55 * Math.PI) / 180;
	export const MIN_BOUNCE = (8 * Math.PI) / 180;
	export const MAX_SERVE = (25 * Math.PI) / 180;
}

const D = partyDefaults;

/** mulberry32: small, fast, deterministic */
function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Side geometry. n = outward normal, t = the defender's right (seen from their side).
const NORMAL: Record<PartySide, [number, number]> = { 0: [0, 1], 1: [-1, 0], 2: [0, -1], 3: [1, 0] };
const RIGHT: Record<PartySide, [number, number]> = { 0: [1, 0], 1: [0, 1], 2: [-1, 0], 3: [0, -1] };

/** distance from (x, y) to the side's edge line, positive inside the court */
export function edgeDistance(side: PartySide, x: number, y: number): number {
	const c = D.COURT;
	return side === 0 ? c - y : side === 1 ? x : side === 2 ? y : c - x;
}

/** coordinate of (x, y) along the side, in the defender's frame (0 = their left corner) */
export function alongSide(side: PartySide, x: number, y: number): number {
	const c = D.COURT;
	return side === 0 ? x : side === 1 ? y : side === 2 ? c - x : c - y;
}

/** world centre of a paddle at `pos` on `side` (on the paddle face line) */
export function paddleWorld(side: PartySide, pos: number): { x: number; y: number } {
	const c = D.COURT;
	const i = D.PADDLE_INSET - D.PADDLE_THICKNESS / 2;
	if (side === 0) return { x: pos, y: c - i };
	if (side === 1) return { x: i, y: pos };
	if (side === 2) return { x: c - pos, y: i };
	return { x: c - i, y: c - pos };
}

interface Seat {
	side: PartySide;
	pos: number;
	dir: -1 | 0 | 1;
	lives: number;
	alive: boolean;
}

export class PartyEngine {
	readonly players: number;
	#random: () => number;
	#seats: Seat[];
	#phase: PartyPhase = "serving";
	#serveIn: number = D.START_DELAY_S;
	#serveBag: number[] = [];
	#serveTo: number | null = null;
	#ball = { x: D.COURT / 2, y: D.COURT / 2, vx: 0, vy: 0 };
	#speed: number = D.BALL_SPEED;
	#sinceTouch = 0;
	#eliminated: number[] = [];
	#winner: number | null = null;
	#lastLoss: number | null = null;
	#acc = 0;
	#step = 0;

	constructor(players: number, seed: number) {
		if (players !== 3 && players !== 4) throw new Error("PartyEngine needs 3 or 4 players");
		this.players = players;
		this.#random = rng(seed);
		this.#seats = Array.from({ length: players }, (_, i) => ({
			side: i as PartySide,
			pos: D.COURT / 2,
			dir: 0 as const,
			lives: D.LIVES,
			alive: true,
		}));
		this.#serveTo = this.#nextServe();
	}

	/** Left/right move the seat's paddle (in that player's own view); anything else is ignored. */
	input(seat: number, inputs: Pick<PlayerInputs, "left" | "right"> | undefined): void {
		const s = this.#seats[seat];
		if (!s || !inputs) return;
		s.dir = ((inputs.right === true ? 1 : 0) - (inputs.left === true ? 1 : 0)) as -1 | 0 | 1;
	}

	/** Knock a seat out now (disconnect past the grace period, forfeit, left the room). */
	eliminate(seat: number): void {
		const s = this.#seats[seat];
		if (!s || !s.alive || this.#phase === "over") return;
		s.lives = 0;
		this.#knockOut(seat);
	}

	get over(): boolean {
		return this.#phase === "over";
	}

	get winner(): number | null {
		return this.#winner;
	}

	/** Advances the simulation by dt seconds in fixed steps. */
	tick(dt: number): void {
		if (!(dt > 0)) return;
		this.#acc += Math.min(dt, D.MAX_DT);
		while (this.#acc >= D.STEP && this.#phase !== "over") {
			this.#acc -= D.STEP;
			this.#stepOnce();
		}
	}

	/** 1 = winner, then by elimination order (the last one out is 2nd). */
	standings(): Omit<PartyStanding, "id" | "name">[] {
		const out: Omit<PartyStanding, "id" | "name">[] = [];
		const alive = this.#seats.map((s, i) => ({ s, i })).filter((x) => x.s.alive);
		for (const { s, i } of alive) out.push({ seat: i, place: 1, lives: s.lives });
		const order = [...this.#eliminated].reverse();
		order.forEach((seat, k) => out.push({ seat, place: alive.length + k + 1, lives: 0 }));
		return out;
	}

	getState(): PartyState {
		const paddles: PartyPaddleView[] = this.#seats.map((s, i) => ({ seat: i, side: s.side, pos: s.pos, lives: s.lives, alive: s.alive }));
		return {
			phase: this.#phase,
			court: D.COURT,
			paddleLength: D.PADDLE_LENGTH,
			paddleInset: D.PADDLE_INSET,
			corner: D.CORNER,
			paddles,
			ball: { x: this.#ball.x, y: this.#ball.y, vx: this.#ball.vx, vy: this.#ball.vy, r: D.BALL_R },
			serveIn: this.#phase === "serving" ? Math.max(0, this.#serveIn) : 0,
			serveTo: this.#serveTo,
			eliminated: [...this.#eliminated],
			winner: this.#winner,
			lastLoss: this.#lastLoss,
			step: this.#step,
		};
	}

	// ---------------------------------------------------------------- simulation

	#stepOnce() {
		this.#step++;
		const min = D.CORNER + D.PADDLE_LENGTH / 2;
		const max = D.COURT - min;
		for (const s of this.#seats) {
			if (!s.alive || s.dir === 0) continue;
			s.pos = Math.min(max, Math.max(min, s.pos + s.dir * D.PADDLE_SPEED * D.STEP));
		}

		if (this.#phase === "serving") {
			this.#serveIn -= D.STEP;
			if (this.#serveIn <= 0) this.#serve();
			return;
		}

		const b = this.#ball;
		const prev = { x: b.x, y: b.y };
		b.x += b.vx * D.STEP;
		b.y += b.vy * D.STEP;
		this.#sinceTouch += D.STEP;

		this.#corners();
		for (let i = 0; i < 4; i++) {
			const side = i as PartySide;
			if (this.#collideSide(side, prev)) return; // a life was lost: the serve pause starts
		}

		if (this.#sinceTouch > D.STALL_S) this.#startServe(D.LOSS_PAUSE_S);
	}

	/** Solid corner blocks: reflect off the nearest point of each square. */
	#corners() {
		const b = this.#ball;
		const c = D.COURT;
		const k = D.CORNER;
		const boxes: [number, number, number, number][] = [
			[0, 0, k, k],
			[c - k, 0, c, k],
			[0, c - k, k, c],
			[c - k, c - k, c, c],
		];
		for (const [x0, y0, x1, y1] of boxes) {
			const px = Math.min(x1, Math.max(x0, b.x));
			const py = Math.min(y1, Math.max(y0, b.y));
			let nx = b.x - px;
			let ny = b.y - py;
			const dist = Math.hypot(nx, ny);
			if (dist >= D.BALL_R) continue;
			if (dist === 0) {
				// centre inside the block (can't happen at these speeds): push out toward the court centre
				nx = c / 2 - b.x;
				ny = c / 2 - b.y;
			}
			const len = Math.hypot(nx, ny) || 1;
			nx /= len;
			ny /= len;
			const vn = b.vx * nx + b.vy * ny;
			if (vn < 0) {
				b.vx -= 2 * vn * nx;
				b.vy -= 2 * vn * ny;
			}
			b.x = px + nx * D.BALL_R;
			b.y = py + ny * D.BALL_R;
		}
	}

	/** Paddle, wall or goal on one side. Returns true when a life was lost. */
	#collideSide(side: PartySide, prev: { x: number; y: number }): boolean {
		const b = this.#ball;
		const [nx, ny] = NORMAL[side];
		const vOut = b.vx * nx + b.vy * ny;
		if (vOut <= 0) return false;
		const seat = this.#seats[side];
		const d = edgeDistance(side, b.x, b.y);
		const r = D.BALL_R;

		if (!seat || !seat.alive) {
			// wall: reflect at the edge
			if (d <= r) {
				b.vx -= 2 * vOut * nx;
				b.vy -= 2 * vOut * ny;
				this.#pushInside(side, r);
			}
			return false;
		}

		const a = alongSide(side, b.x, b.y);
		const prevD = edgeDistance(side, prev.x, prev.y);
		const half = D.PADDLE_LENGTH / 2;
		if (prevD - r >= D.PADDLE_INSET && d - r < D.PADDLE_INSET && Math.abs(a - seat.pos) <= half + r) {
			this.#bounce(side, seat, a);
			return false;
		}
		if (d < -r) {
			this.#loseLife(side);
			return true;
		}
		return false;
	}

	#pushInside(side: PartySide, dist: number) {
		const b = this.#ball;
		const c = D.COURT;
		if (side === 0) b.y = c - dist;
		else if (side === 1) b.x = dist;
		else if (side === 2) b.y = dist;
		else b.x = c - dist;
	}

	#bounce(side: PartySide, seat: Seat, along: number) {
		const offset = Math.max(-1, Math.min(1, (along - seat.pos) / (D.PADDLE_LENGTH / 2)));
		let angle = offset * D.MAX_BOUNCE;
		// never straight back: a still paddle can't hold a rally forever
		if (Math.abs(angle) < D.MIN_BOUNCE) angle = (offset > 0 || (offset === 0 && this.#random() < 0.5) ? 1 : -1) * D.MIN_BOUNCE;
		this.#speed = Math.min(D.BALL_SPEED_MAX, this.#speed * D.SPEED_UP);
		const [nx, ny] = NORMAL[side];
		const [tx, ty] = RIGHT[side];
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		this.#ball.vx = this.#speed * (-nx * cos + tx * sin);
		this.#ball.vy = this.#speed * (-ny * cos + ty * sin);
		this.#pushInside(side, D.PADDLE_INSET + D.BALL_R);
		this.#sinceTouch = 0;
	}

	#loseLife(side: PartySide) {
		const seat = this.#seats[side];
		if (!seat) return;
		seat.lives = Math.max(0, seat.lives - 1);
		this.#lastLoss = side;
		if (seat.lives === 0) this.#knockOut(side);
		if (this.#phase !== "over") this.#startServe(D.LOSS_PAUSE_S);
	}

	#knockOut(seatIndex: number) {
		const seat = this.#seats[seatIndex];
		if (!seat || !seat.alive) return;
		seat.alive = false;
		seat.dir = 0;
		this.#eliminated.push(seatIndex);
		const alive = this.#seats.map((s, i) => (s.alive ? i : -1)).filter((i) => i >= 0);
		if (alive.length <= 1) {
			this.#phase = "over";
			this.#winner = alive[0] ?? null;
			this.#serveTo = null;
			this.#ball.vx = 0;
			this.#ball.vy = 0;
			return;
		}
		// a pending serve can't go to someone who is out
		if (this.#phase === "serving" && this.#serveTo === seatIndex) {
			this.#serveTo = this.#nextServe();
		}
	}

	#startServe(pause: number) {
		this.#phase = "serving";
		this.#serveIn = pause;
		this.#ball = { x: D.COURT / 2, y: D.COURT / 2, vx: 0, vy: 0 };
		this.#speed = D.BALL_SPEED;
		this.#sinceTouch = 0;
		this.#serveTo = this.#nextServe();
	}

	/** Next seat from a seeded shuffle bag of the alive seats (each served once per bag). */
	#nextServe(): number | null {
		const alive = (i: number) => this.#seats[i]?.alive === true;
		this.#serveBag = this.#serveBag.filter(alive);
		if (this.#serveBag.length === 0) {
			const bag = this.#seats.map((_, i) => i).filter(alive);
			for (let i = bag.length - 1; i > 0; i--) {
				const j = Math.floor(this.#random() * (i + 1));
				[bag[i], bag[j]] = [bag[j]!, bag[i]!];
			}
			this.#serveBag = bag;
		}
		return this.#serveBag.shift() ?? null;
	}

	#serve() {
		const to = this.#serveTo !== null && this.#seats[this.#serveTo]?.alive ? this.#serveTo : this.#nextServe();
		if (to === null) return;
		this.#serveTo = to;
		const side = this.#seats[to]!.side;
		const angle = (this.#random() * 2 - 1) * D.MAX_SERVE;
		const [nx, ny] = NORMAL[side];
		const [tx, ty] = RIGHT[side];
		this.#ball = {
			x: D.COURT / 2,
			y: D.COURT / 2,
			vx: this.#speed * (nx * Math.cos(angle) + tx * Math.sin(angle)),
			vy: this.#speed * (ny * Math.cos(angle) + ty * Math.sin(angle)),
		};
		this.#phase = "playing";
		this.#sinceTouch = 0;
	}
}
