import crypto from 'node:crypto';
import { config } from '../config.ts';
import { matchesFinished, resultReportsFailed } from '../metrics.ts';

const REQUEST_TIMEOUT_MS = 5_000;
const RETRY_DELAYS_MS = [1_000, 4_000, 15_000];

type Logger = { error: (obj: object, msg: string) => void };
let log: Logger = { error: (obj, msg) => console.error(msg, obj) };

/** index.ts hands over the Fastify logger so reports log through pino. */
export function setReportLogger(logger: Logger): void {
  log = logger;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POSTs a result to the users service with the internal service token.
 * Retries on network errors and 5xx; the body carries an idempotency key, so a retry
 * after a lost response cannot record the result twice. Never awaited from the tick.
 */
async function postWithRetry(path: string, body: unknown, label: string, kind: 'match' | 'tournament'): Promise<void> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await fetch(`${config.usersApiUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.internalServiceToken}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) return;
      if (response.status < 500) {
        // A 4xx will not succeed on retry; log status only (no body, no payload).
        log.error({ status: response.status }, `${label} rejected by users service`);
        resultReportsFailed.inc({ kind });
        return;
      }
      log.error({ status: response.status, attempt: attempt + 1 }, `${label} failed`);
    } catch (err) {
      log.error({ error: (err as Error).name, attempt: attempt + 1 }, `${label} failed`);
    }
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay === undefined) break;
    await sleep(delay);
  }
  log.error({ attempts: RETRY_DELAYS_MS.length + 1 }, `${label} dropped`);
  resultReportsFailed.inc({ kind });
}

// The users service caps display names at 50 characters; never lose a result over a long name
function clipNames<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = { ...obj };
  for (const key of ['player1DisplayName', 'player2DisplayName', 'name']) {
    if (typeof out[key] === 'string') out[key] = (out[key] as string).slice(0, 50);
  }
  return out as T;
}

export function reportMatchResult(result: Record<string, unknown>): void {
  const body = { matchId: crypto.randomUUID(), ...clipNames(result) };
  matchesFinished.inc({ mode: 'standard' });
  void postWithRetry('/internal/game/match-result', body, 'match result', 'match');
}

/** A finished party (3–4 players): one row with every player's placement. */
export function reportPartyResult(result: { matchId: string; players: { displayName: string }[] } & Record<string, unknown>): void {
  const body = { ...result, players: result.players.map((p) => ({ ...p, displayName: p.displayName.slice(0, 50) })) };
  void postWithRetry('/internal/game/party-result', body, 'party result', 'match');
}

export function reportTournamentResult(result: Record<string, unknown>): void {
  // The tournament id is the idempotency key on the users side.
  const clipped = clipNames(result);
  if (Array.isArray(clipped.matches)) clipped.matches = clipped.matches.map((m: Record<string, unknown>) => clipNames(m));
  void postWithRetry('/internal/game/tournament-result', clipped, 'tournament result', 'tournament');
}
