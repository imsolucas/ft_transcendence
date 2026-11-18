import { config } from "../config.ts";
import { parseLook, type PlayerLook } from "shared/index.ts";

export interface AuthenticatedUser {
  id: number;
  username: string;
  displayName: string;
  avatar: string | null;
  look: PlayerLook | null;
  rating: number | null;
}

const TIMEOUT_MS = 3_000;

function internalHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.internalServiceToken}`,
  };
}

/**
 * Resolves the browser session behind a socket handshake by forwarding its Cookie header
 * verbatim to the users service (Better Auth decides; revoked sessions fail immediately).
 */
export async function resolveSession(cookieHeader: string | undefined): Promise<AuthenticatedUser | null> {
  if (!cookieHeader) return null;
  try {
    const res = await fetch(`${config.usersApiUrl}/internal/session`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({ cookie: cookieHeader }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: { id: number; username: string; displayName: string; avatar: string | null; look?: unknown }; rating?: unknown };
    if (!data.user || !Number.isInteger(data.user.id)) return null;
    return {
      id: data.user.id,
      username: data.user.username,
      displayName: data.user.displayName,
      avatar: data.user.avatar,
      // checked again here: the game only forwards a look it can parse
      look: parseLook(data.user.look),
      rating: typeof data.rating === 'number' && Number.isFinite(data.rating) ? data.rating : null,
    };
  } catch {
    return null;
  }
}

export type Presence = "ONLINE" | "INGAME" | "OFFLINE";

/** Fire-and-forget presence update; failures are logged by the caller's logger only. */
export async function setPresence(userId: number, presence: Presence): Promise<boolean> {
  try {
    const res = await fetch(`${config.usersApiUrl}/internal/presence`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({ userId, presence }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}
