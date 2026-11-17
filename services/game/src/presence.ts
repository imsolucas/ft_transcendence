import { config } from './config.ts';
import { setPresence, type Presence } from './auth/usersClient.ts';

/**
 * Presence is derived from live sockets and games, and written to the users service.
 * Writes are serialised per user (a reload's OFFLINE can't land after the new ONLINE),
 * and each write sends the state computed at send time, not at enqueue time.
 */
const liveSockets = new Map<number, number>();
const inGame = new Set<number>();
const chains = new Map<number, Promise<unknown>>();

function current(userId: number): Presence {
  if ((liveSockets.get(userId) ?? 0) === 0) return 'OFFLINE';
  return inGame.has(userId) ? 'INGAME' : 'ONLINE';
}

function sync(userId: number) {
  const prev = chains.get(userId) ?? Promise.resolve();
  const next = prev.then(() => setPresence(userId, current(userId))).catch(() => {});
  chains.set(userId, next);
  void next.finally(() => {
    if (chains.get(userId) === next) chains.delete(userId);
  });
}

export function socketOpened(userId: number): number {
  const n = (liveSockets.get(userId) ?? 0) + 1;
  liveSockets.set(userId, n);
  // back within the grace period: the pending OFFLINE never happens (ONLINE re-synced anyway)
  const pending = offlineTimers.get(userId);
  if (pending) {
    clearTimeout(pending);
    offlineTimers.delete(userId);
  }
  if (n === 1) sync(userId);
  return n;
}

/** A reload closes the old socket just before the new one opens: wait before going OFFLINE. */
const OFFLINE_GRACE_MS = 5_000;
const offlineTimers = new Map<number, ReturnType<typeof setTimeout>>();

export function socketClosed(userId: number) {
  const n = (liveSockets.get(userId) ?? 1) - 1;
  if (n <= 0) {
    liveSockets.delete(userId);
    inGame.delete(userId);
    clearTimeout(offlineTimers.get(userId));
    offlineTimers.set(
      userId,
      setTimeout(() => {
        offlineTimers.delete(userId);
        // still no socket after the grace period: really gone
        if (!liveSockets.has(userId)) sync(userId);
      }, OFFLINE_GRACE_MS),
    );
  } else {
    liveSockets.set(userId, n);
  }
}

export function socketCount(userId: number) {
  return liveSockets.get(userId) ?? 0;
}

/** Player ids in the game code are strings */
export function gameStarted(playerIds: string[]) {
  for (const id of playerIds) {
    const userId = Number(id);
    if (!Number.isInteger(userId)) continue;
    inGame.add(userId);
    sync(userId);
  }
}

export function gameEnded(playerIds: string[]) {
  for (const id of playerIds) {
    const userId = Number(id);
    if (!Number.isInteger(userId) || !inGame.delete(userId)) continue;
    sync(userId);
  }
}

/** On boot nobody is connected: clear stale ONLINE/INGAME left by a previous process. */
export async function resetAllPresence(): Promise<boolean> {
  try {
    const res = await fetch(`${config.usersApiUrl}/internal/presence/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.internalServiceToken}` },
      body: '{}',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
