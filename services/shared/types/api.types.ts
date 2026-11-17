// HTTP API contract between apps/web and services/users (Phase 1+2).
// All browser routes live under /api on the one origin (Caddy). Auth is the Better Auth
// session cookie; every route below needs a signed-in user unless marked otherwise.
// Errors are { error: string } with an HTTP status. Lists are paginated where marked.

export type Presence = "ONLINE" | "INGAME" | "OFFLINE";

/** A user as other players see them. `username` is the lowercase handle used in URLs. */
export interface PublicUser {
  id: number;
  username: string;
  displayName: string;
  avatar: string | null;
  presence: Presence;
}

/** GET /api/me */
export interface Me extends PublicUser {
  email: string;
  twoFactorEnabled: boolean;
}

/** PATCH /api/me — body */
export interface UpdateMeBody {
  displayName?: string;
}

/** POST /api/me/avatar (multipart, field "file": png/jpeg/webp ≤ 2 MB) → Me. DELETE /api/me/avatar → Me */

export type FriendshipState = "none" | "friends" | "request_sent" | "request_received" | "blocked" | "blocked_you";

export interface UserStats {
  wins: number;
  losses: number;
  winRate: number; // 0..1
  currentStreak: number; // positive = wins in a row, negative = losses in a row
  /** Last 8 ISO weeks, oldest first */
  winsPerWeek: { weekStart: string; wins: number }[];
}

/** GET /api/users/:username */
export interface Profile extends PublicUser {
  memberSince: string;
  friendship: FriendshipState;
  stats: UserStats;
}

export interface Page<T> {
  items: T[];
  page: number; // 1-based
  pageSize: number;
  total: number;
}

/** GET /api/users/search?q=&page= → Page<PublicUser & { friendship: FriendshipState }> (q ≥ 2 chars) */
export type SearchResult = PublicUser & { friendship: FriendshipState };

export interface MatchSummary {
  id: number;
  playedAt: string;
  endedAt: string;
  durationSeconds: number;
  /** From the requested player's point of view */
  you: { user: PublicUser; displayName: string; score: number };
  opponent: { user: PublicUser; displayName: string; score: number };
  result: "win" | "loss" | "draw";
  tournament: { id: number; name: string } | null;
}

/** GET /api/users/:username/matches?page=&pageSize=10 → Page<MatchSummary> */

export interface FriendRequest {
  id: number;
  user: PublicUser; // the other side
  direction: "received" | "sent";
  createdAt: string;
}

/**
 * GET    /api/friends                           → PublicUser[] (accepted friends)
 * GET    /api/friends/requests                  → FriendRequest[] (both directions)
 * POST   /api/friends/requests  { username }    → FriendRequest
 * POST   /api/friends/requests/:id/accept       → PublicUser
 * POST   /api/friends/requests/:id/decline      → 204
 * DELETE /api/friends/requests/:id              → 204 (cancel a sent request)
 * DELETE /api/friends/:username                 → 204
 * GET    /api/blocks                            → PublicUser[]
 * POST   /api/blocks { username }               → 204 (also removes friendship/requests)
 * DELETE /api/blocks/:username                  → 204
 */

export interface ApiKeySummary {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * GET    /api/api-keys            → ApiKeySummary[]
 * POST   /api/api-keys { name }   → ApiKeySummary & { key: string } (shown once)
 * DELETE /api/api-keys/:id        → 204
 */
export interface CreatedApiKey extends ApiKeySummary {
  key: string;
}

/**
 * GET    /api/sessions        → SessionInfo[] (this user's active sessions)
 * DELETE /api/sessions/:id    → 204
 * DELETE /api/sessions        → 204 (log out everywhere except this device)
 */
export interface SessionInfo {
  id: number;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  current: boolean;
}

// Better Auth JSON responses never contain session tokens (stripped by the users service).
// Better Auth (not ours) serves /api/auth/*: sign-up/email, sign-in/username,
// sign-in/email, sign-in/social (google), sign-out, get-session, list-sessions,
// revoke-session, change-password, two-factor/*.
