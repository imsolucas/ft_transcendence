import type { RealtimeEvent } from "../../../shared/types/api.types.ts";
import { config } from "../config.ts";

/**
 * Pushes realtime events to users through the game service's Socket.IO connections.
 * Fire-and-forget: a missed push only delays an update the client also gets by polling.
 */
export function notify(userIds: number[], event: RealtimeEvent): void {
  if (userIds.length === 0) return;
  fetch(`${config.gameInternalUrl}/internal/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.internalServiceToken}` },
    body: JSON.stringify({ userIds, event }),
    signal: AbortSignal.timeout(2000),
  }).catch(() => {});
}
