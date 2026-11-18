/**
 * Ranked play: Glicko-2 ratings per monthly season, divisions and the season soft reset.
 * Pure functions shared by users (rating updates, API) and web (badges). No DOM, no Node APIs.
 *
 * Glicko-2: Mark Glickman, "Example of the Glicko-2 system" (2013). Each ranked match is
 * treated as its own rating period (common for online games).
 */

export const START_RATING = 1500;
export const START_RD = 350;
export const START_VOL = 0.06;
/** system constant: how much volatility may change (0.3–1.2; smaller = steadier) */
const TAU = 0.5;
const SCALE = 173.7178;
const EPSILON = 0.000001;
/** RD never drops below this, so ratings keep moving */
const MIN_RD = 45;
/** placement: divisions show after this many ranked games */
export const PLACEMENT_GAMES = 5;

export interface Glicko {
  rating: number;
  rd: number;
  vol: number;
}

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const E = (mu: number, muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

/** New rating for `player` after one game against `opponent`; score 1 = win, 0 = loss. */
export function glicko2(player: Glicko, opponent: Glicko, score: 0 | 1): Glicko {
  const mu = (player.rating - START_RATING) / SCALE;
  const phi = player.rd / SCALE;
  const muJ = (opponent.rating - START_RATING) / SCALE;
  const phiJ = opponent.rd / SCALE;

  const gJ = g(phiJ);
  const e = E(mu, muJ, phiJ);
  const v = 1 / (gJ * gJ * e * (1 - e));
  const delta = v * gJ * (score - e);

  // new volatility (Illinois algorithm, step 5 of the paper)
  const a = Math.log(player.vol * player.vol);
  const f = (x: number) => {
    const ex = Math.exp(x);
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * (phi * phi + v + ex) ** 2) - (x - a) / (TAU * TAU);
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > EPSILON; i++) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else fA /= 2;
    B = C;
    fB = fC;
  }
  const vol = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + vol * vol);
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muNew = mu + phiNew * phiNew * gJ * (score - e);
  return {
    rating: muNew * SCALE + START_RATING,
    rd: Math.max(MIN_RD, Math.min(START_RD, phiNew * SCALE)),
    vol,
  };
}

/** A new season starts halfway back to 1500, with more uncertainty (soft reset). */
export function softReset(prev: Glicko | null): Glicko {
  if (!prev) return { rating: START_RATING, rd: START_RD, vol: START_VOL };
  return { rating: START_RATING + (prev.rating - START_RATING) / 2, rd: Math.max(prev.rd, 250), vol: prev.vol };
}

export const DIVISIONS = ["bronze", "silver", "gold", "platinum", "diamond", "master"] as const;
export type Division = (typeof DIVISIONS)[number];
const FLOORS: Record<Division, number> = { bronze: 0, silver: 1350, gold: 1500, platinum: 1650, diamond: 1800, master: 1950 };

/** null while still in placement */
export function divisionFor(rating: number, games: number): Division | null {
  if (games < PLACEMENT_GAMES) return null;
  let d: Division = "bronze";
  for (const name of DIVISIONS) if (rating >= FLOORS[name]) d = name;
  return d;
}

/** Monthly seasons (UTC): the month containing `at`. */
export function seasonBounds(at: Date): { startsAt: Date; endsAt: Date } {
  const startsAt = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
  const endsAt = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1));
  return { startsAt, endsAt };
}
