---
description: Realtime / WebSocket conventions — authoritative game server, protocol types, tick loop, reconnection, broadcasting, chat/presence. Apply when touching the game service, the WS protocol, or any client code that opens a socket.
paths:
  - "services/game/**"
  - "services/shared/types/**"
  - "services/shared/game-engine/**"
  - "services/frontend/src/game/**"
  - "services/frontend/src/pages/onlineGamePage.ts"
  - "services/frontend/src/components/matchmaking/**"
  - "services/frontend/src/components/chat/**"
  - "apps/web/**/realtime/**"
  - "apps/web/**/game/**"
---

# Realtime rule

## Protocol

- The single source of truth for message shapes is `services/shared/types/protocol.types.ts`.
  Add a message type there first (discriminated union on `type`), then the server handler,
  then the client. Never send an ad-hoc object that is not in the union.
- Server-side, every inbound message is validated (schema + size) before routing; see
  `security-hardening.md` §5. Bump a `protocolVersion` field when a change is not
  backwards compatible.

## Authority

- The server owns game state: ball, scores, timers, room membership, tournament brackets.
  Clients send **inputs** (paddle up/down/stop with a sequence number), never positions or
  scores.
- The client may predict its own paddle and interpolate the opponent and ball between
  snapshots; it reconciles to the server snapshot.
- The physics in `services/shared/game-engine` must be deterministic for a given input
  sequence so the client prediction and the server agree.

## Tick loop and broadcasting

- `TickSystem` runs the simulation at a fixed rate; broadcasting can run at a lower rate
  than the simulation. Do not do I/O (DB, fetch) inside a tick. Results are reported
  after the match, asynchronously, with retry + idempotency key.
- Broadcast per room through `Broadcaster`; never iterate all sockets for a room event.
  Skip sockets whose `readyState !== OPEN`.

## Connection lifecycle

- Heartbeat: server pings every ~15 s; a socket with no pong in 2 intervals is terminated.
- Disconnect during a match: hold the slot for a grace period (e.g. 15 s), pause or keep
  simulating per the game mode, notify the opponent ("reconnecting…"), and forfeit when the
  grace period runs out. Reconnect with the same authenticated user restores the slot.
- Client reconnects with exponential backoff + jitter, and shows its state (connecting,
  reconnecting, offline). No silent retries.
- Cleanup on close is idempotent: queue removal, room removal and presence update may run
  twice without error.

## Chat and presence (Phase 3)

- Chat messages are persisted before they are broadcast; the broadcast carries the stored
  id and timestamp. Respect blocks on the server.
- Presence (online / in game / offline) is derived from live sockets, not from a
  login-time `status` column alone.

## Verify

- Two browsers (or one normal + one private window) as two users: play a match end to end,
  kill one tab mid-match and reopen it within the grace period, then outside it.
- Browser console clean on both sides throughout.
