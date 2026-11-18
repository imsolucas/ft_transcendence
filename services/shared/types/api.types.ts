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
  achievements: Achievement[];
  progress: Progress;
}

export interface Page<T> {
  items: T[];
  page: number; // 1-based
  pageSize: number;
  total: number;
}

/**
 * GET /api/users/search?q=&presence=&relation=&sort=&page= → Page<SearchResult>
 * q: name contains (optional); presence: ONLINE | INGAME | OFFLINE; relation: friends | others;
 * sort: name (default) | newest | wins.
 */
export type SearchSort = "name" | "newest" | "wins";
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

// ---------------------------------------------------------------- Chat (Phase 3)
export interface ChatMessage {
  id: number;
  from: number;
  to: number;
  /**
   * text / invite (private-room code) from players; result ("5-3", sender = player 1,
   * recipient = player 2) and tournament (body = tournament name, sender = champion) are
   * game notifications posted by the server.
   */
  kind: "text" | "invite" | "result" | "tournament";
  body: string;
  /** Private-room code for kind "invite" */
  inviteCode: string | null;
  createdAt: string;
  readAt: string | null;
  /** removed by content moderation (body is then empty) */
  removed?: boolean;
}

export interface Conversation {
  user: PublicUser;
  lastMessage: ChatMessage;
  unread: number;
}

/**
 * GET  /api/chat/conversations                         → Conversation[] (newest first)
 * GET  /api/chat/:username/messages?before=<id>&limit= → ChatMessage[] (oldest first, ≤ 50)
 * POST /api/chat/:username/messages { body } | { invite: roomCode } → 201 ChatMessage
 *      (404 when either side blocked the other; 400 empty / too long)
 * POST /api/chat/:username/read                        → 204 (marks their messages to you as read)
 * GET  /api/chat/unread                                → { count }
 */

// ---------------------------------------------------------------- Realtime events
/**
 * The app-wide Socket.IO connection (path /ws) receives "notify" events with one of these.
 * Clients may emit "chat:typing" { to: userId } (relayed as a "chat:typing" notify).
 */
export type RealtimeEvent =
  | { type: "chat:message"; message: ChatMessage; from: PublicUser }
  | { type: "chat:read"; by: number; upTo: number }
  | { type: "chat:typing"; from: number }
  | { type: "friend:request"; from: PublicUser }
  | { type: "friend:accepted"; by: PublicUser }
  | { type: "presence"; userId: number; presence: Presence }
  | { type: "achievement"; id: AchievementId }
  | { type: "levelUp"; level: number }
  /** a chat message was removed by moderation (both people in the thread get it) */
  | { type: "chat:removed"; messageId: number }
  /** to the sender of a removed message; mutedUntil is set after repeated removals */
  | { type: "moderation:warning"; category: ModerationCategory; mutedUntil: string | null };

export type ModerationCategory = "harassment" | "hate" | "threat" | "sexual" | "spam" | "other";

// ---------------------------------------------------------------- AI coach
/** POST /api/ai/chat body; the answer streams back as SSE: delta {text} … done {stopReason} | error {code} */
export interface CoachRequest {
  messages: { role: "user" | "assistant"; content: string }[];
}
/** GET /api/ai/status */
export interface AiStatus {
  enabled: boolean;
  remaining: number;
  limit: number;
}

// ---------------------------------------------------------------- Status (Phase 4)
export type ServiceState = "up" | "degraded" | "down";
export interface ServiceStatus {
  name: "api" | "database" | "game";
  state: ServiceState;
  latencyMs: number | null;
}
/** GET /api/status (public, cached ~5s) */
export interface StatusReport {
  overall: ServiceState;
  services: ServiceStatus[];
  checkedAt: string;
  uptimeSeconds: number;
}

// ---------------------------------------------------------------- Gamification (Phase 5)
export type AchievementId =
  | "first_win"
  | "ten_wins"
  | "fifty_wins"
  | "regular"
  | "streak_5"
  | "shutout"
  | "champion"
  | "social";
/** Computed from match / tournament / friend data; `progress` counts towards `target`. */
export interface Achievement {
  id: AchievementId;
  unlocked: boolean;
  /** when it was first unlocked (stored; stays unlocked even if progress later drops) */
  unlockedAt: string | null;
  progress: number;
  target: number;
}
/** XP/level (stored on the user; earned from matches, wins, titles and achievements). */
export interface Progress {
  xp: number;
  level: number;
  /** XP where the current level starts and where the next one starts */
  levelXp: number;
  nextLevelXp: number;
}
export interface LeaderboardRow {
  rank: number;
  user: PublicUser;
  level: number;
  wins: number;
  losses: number;
  winRate: number; // 0..1
}
/** GET /api/leaderboard?page= → Page<LeaderboardRow> & { you: LeaderboardRow | null } */
export type Leaderboard = Page<LeaderboardRow> & { you: LeaderboardRow | null };
