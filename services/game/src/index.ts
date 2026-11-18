import fastify from 'fastify';
import { Server, type Socket } from 'socket.io';
import type { GameMessage } from 'shared';
import type { LiveMatch, LiveMatchesMessage, Player, SpectateStartedMessage, SpectatorCountMessage } from 'shared';
import { config } from './config.ts';
import { resolveSession, type AuthenticatedUser } from './auth/usersClient.ts';
import { resetAllPresence, socketClosed, socketCount, socketOpened } from './presence.ts';
import { InMemoryPlayerStorage } from './storage/playerStorage.ts';
import { MessageBroadcaster } from './websocket/Broadcaster.ts';
import { RoomManager } from './game/roomManager.ts';
import NewMessageHandler from './websocket/MessageHandler.ts';
import TickSytem from './websocket/TickSystem.ts';
import { setReportLogger } from './utils/reportResults.ts';
import crypto from 'node:crypto';
import { HallService } from './hall/HallService.ts';

function safeEqual(a: string, b: string) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Wraps a Socket.IO socket in the small WebSocket-like surface the game code uses
 * (send / readyState / close), so rooms, ticks and broadcasts stay unchanged.
 * Every protocol message travels as one JSON string on the "message" event.
 */
class SocketAdapter {
  constructor(private readonly socket: Socket) {}
  send(data: string) {
    if (this.socket.connected) this.socket.emit('message', data);
  }
  get readyState() {
    return this.socket.connected ? 1 : 3;
  }
  close(_code?: number, _reason?: string) {
    this.socket.disconnect(true);
  }
}

const server = fastify({ logger: { level: process.env.LOG_LEVEL || 'info' }, trustProxy: 1 });
setReportLogger(server.log);
// A stray rejected promise must be logged, not take every live match down with the process
process.on('unhandledRejection', (err) => server.log.error({ err }, 'unhandled rejection'));

const playerStorage = new InMemoryPlayerStorage();
const roomManager = new RoomManager(playerStorage);
const broadcaster = new MessageBroadcaster(roomManager);
const messageHandler = new NewMessageHandler(roomManager, broadcaster);
// one TournamentService: it owns the bracket timers, so the tick loop shares the handler's
const tournamentService = messageHandler.tournamentService;
const tickSystem = new TickSytem(roomManager, tournamentService, broadcaster, messageHandler.partyService);

// ---- Spectator mode: watchers of room X join the Socket.IO room "watch:X"
const watchRoom = (roomId: string) => `watch:${roomId}`;
const spectatorCount = (roomId: string) => io.sockets.adapter.rooms.get(watchRoom(roomId))?.size ?? 0;

/** A match can be watched while it is being played, unless the room is private. */
function liveMatch(roomId: string): LiveMatch | null {
  const room = roomManager.getRoom(roomId);
  if (!room || room.config.isPrivate || room.status !== 'playing') return null;
  if (room.mode === 'party') {
    // every seat (knocked-out players stay listed); scores = lives left per seat
    const party = room.party;
    if (!party) return null;
    const lives = party.engine.livesBySeat();
    return { roomId: room.id, mode: 'party', game: party.game, players: party.seats.map((s) => ({ id: s.id, name: s.name })), scores: lives, spectators: spectatorCount(room.id) };
  }
  // a tournament room plays one bracket match at a time: its two players
  const ids = room.mode === 'tournament' ? (tournamentService.currentPair(room) ?? []) : room.playerIds.slice(0, 2);
  const players = ids
    .map((id) => (id ? roomManager.getPlayer(id) : undefined))
    .filter((p): p is Player => !!p)
    .map((p) => ({ id: p.id, name: p.name }));
  return { roomId: room.id, mode: room.mode, players, scores: room.gameServer?.getGameState().scores ?? [0, 0], spectators: spectatorCount(room.id) };
}

function announceSpectators(roomId: string) {
  const msg: SpectatorCountMessage = { type: 'spectatorCount', data: { roomId, count: spectatorCount(roomId) }, timestamp: Date.now() };
  broadcaster.broadcastToRoom(roomId, msg);
}

server.get('/health', async () => ({ status: 'healthy', service: 'game', timestamp: new Date().toISOString() }));

// Users service → browsers: push a realtime event to every socket of the given users.
// Service token only; Caddy never routes /internal/*.
server.post('/internal/notify', async (req, reply) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || !safeEqual(token, config.internalServiceToken)) return reply.code(401).send({ error: 'Unauthorized' });
  const body = req.body as { userIds?: unknown; event?: unknown };
  if (!Array.isArray(body?.userIds) || body.userIds.length > 100 || !body.userIds.every((id) => Number.isInteger(id)) || typeof body.event !== 'object' || body.event === null) {
    return reply.code(400).send({ error: 'Invalid notify body' });
  }
  io.to((body.userIds as number[]).map((id) => `user:${id}`)).emit('notify', body.event);
  return reply.code(204).send();
});

const io = new Server(server.server, {
  path: config.ws.path,
  // WebSocket only: no long-polling fallback to secure separately
  transports: ['websocket'],
  maxHttpBufferSize: config.ws.maxPayloadBytes,
  serveClient: false,
  pingInterval: 15_000,
  pingTimeout: 10_000,
  // A WebSocket handshake is not subject to CORS: check Origin ourselves
  allowRequest: (req, done) => {
    const ok = req.headers.origin === config.publicOrigin;
    if (!ok) server.log.warn({ origin: req.headers.origin }, '[security] socket handshake from disallowed origin');
    done(null, ok);
  },
});

// the arcade hall (walk-around room with the cabinets)
const hall = new HallService(io, server.log);

const MAX_SOCKETS_PER_USER = 5;
const HANDSHAKES_PER_IP_PER_MINUTE = 30;
const SESSION_RECHECK_MS = 60_000;

// Per-IP handshake budget: each handshake costs a session lookup on the users service
const handshakeBudget = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of handshakeBudget) if (now > b.resetAt) handshakeBudget.delete(ip);
}, 60_000).unref();

function clientIp(socket: Socket) {
  // Caddy is the only proxy; it appends the real client address last
  const xff = socket.handshake.headers['x-forwarded-for'];
  const last = typeof xff === 'string' ? xff.split(',').pop()?.trim() : undefined;
  return last || socket.handshake.address;
}

broadcaster.setSpectatorMirror((roomId, json) => io.to(watchRoom(roomId)).emit('message', json));

// Authenticate every socket from its session cookie before it is accepted
io.use(async (socket, next) => {
  const ip = clientIp(socket);
  const now = Date.now();
  const budget = handshakeBudget.get(ip);
  if (!budget || now > budget.resetAt) handshakeBudget.set(ip, { count: 1, resetAt: now + 60_000 });
  else if (++budget.count > HANDSHAKES_PER_IP_PER_MINUTE) return next(new Error('RATE_LIMITED'));

  const user = await resolveSession(socket.handshake.headers.cookie);
  if (!user) return next(new Error('UNAUTHORIZED'));
  if (socketCount(user.id) >= MAX_SOCKETS_PER_USER) return next(new Error('TOO_MANY_CONNECTIONS'));
  socket.data.user = user;
  next();
});

io.on('connection', (socket) => {
  const user = socket.data.user as AuthenticatedUser;
  const log = server.log.child({ userId: user.id, socketId: socket.id });
  const adapter = new SocketAdapter(socket);
  let currentPlayer: Player | null = null;
  let watching: string | null = null;
  const leaveWatch = () => {
    if (!watching) return;
    const was = watching;
    watching = null;
    void socket.leave(watchRoom(was));
    announceSpectators(was);
  };

  socketOpened(user.id);
  // Every socket of a user shares a room so the users service can push events to them
  void socket.join(`user:${user.id}`);

  // Typing indicator relay (at most one per second per socket)
  let lastTyping = 0;
  socket.on('chat:typing', (payload: unknown) => {
    const to = (payload as { to?: unknown })?.to;
    if (!Number.isInteger(to) || to === user.id) return;
    const now = Date.now();
    if (now - lastTyping < 1000) return;
    lastTyping = now;
    io.to(`user:${to}`).emit('notify', { type: 'chat:typing', from: user.id });
  });

  // Re-check the session regularly: a revoked or expired session loses its socket
  const cookie = socket.handshake.headers.cookie;
  const recheck = setInterval(async () => {
    const still = await resolveSession(cookie);
    if (!still || still.id !== user.id) {
      log.info('session no longer valid; disconnecting socket');
      socket.emit('message', JSON.stringify({ type: 'connectionError', data: { message: 'Session expired', code: 'SESSION_EXPIRED' }, timestamp: Date.now() }));
      socket.disconnect(true);
    }
  }, SESSION_RECHECK_MS);

  // Per-socket rate limit (fixed one-second window)
  let windowStart = Date.now();
  let messagesInWindow = 0;

  // Latency probe for the client's connection-quality indicator
  socket.on('latency', (ack: unknown) => {
    if (typeof ack === 'function') ack();
  });

  socket.on('message', (raw: unknown) => {
    const now = Date.now();
    if (now - windowStart >= 1000) {
      windowStart = now;
      messagesInWindow = 0;
    }
    if (++messagesInWindow > config.ws.maxMessagesPerSecond) {
      log.warn('[security] socket message rate exceeded; disconnecting');
      socket.disconnect(true);
      return;
    }
    if (typeof raw !== 'string' || raw.length > config.ws.maxPayloadBytes) return;

    let data: GameMessage;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    if (!data || typeof data !== 'object' || typeof (data as { type?: unknown }).type !== 'string') return;

    // ---- arcade hall (handled here: it needs this socket's Socket.IO rooms)
    if (data.type === 'hallJoin') return hall.join(socket, user);
    if (data.type === 'hallInput') return hall.input(socket, user, (data.data as { bits?: unknown } | undefined)?.bits);
    if (data.type === 'hallEmote') return hall.emote(socket, user, (data.data as { emote?: unknown } | undefined)?.emote);
    if (data.type === 'hallLeave') return hall.leave(socket, user);

    // ---- spectator mode (handled here: it needs this socket's Socket.IO rooms)
    if (data.type === 'liveMatches') {
      const matches = roomManager
        .getActiveRooms()
        .map((r) => liveMatch(r.id))
        .filter((m): m is LiveMatch => m !== null)
        .slice(0, 50);
      const reply: LiveMatchesMessage = { type: 'liveMatchesList', data: { matches }, timestamp: Date.now() };
      adapter.send(JSON.stringify(reply));
      return;
    }
    if (data.type === 'spectate') {
      const req = (data.data ?? {}) as { roomId?: unknown; userId?: unknown };
      const roomId =
        typeof req.roomId === 'string' ? req.roomId : Number.isInteger(req.userId) ? roomManager.getPlayer(String(req.userId))?.roomId : undefined;
      const match = roomId ? liveMatch(roomId) : null;
      const sendError = (code: string, message: string) => adapter.send(JSON.stringify({ type: 'Error', data: { message, code }, timestamp: Date.now() }));
      if (!match) return sendError('SPECTATE_NOT_FOUND', 'No public match to watch.');
      if (match.players.some((p) => p.id === String(user.id))) return sendError('SPECTATE_OWN_MATCH', 'You are playing in this match.');
      if (watching && watching !== match.roomId) leaveWatch();
      watching = match.roomId;
      void socket.join(watchRoom(match.roomId));
      announceSpectators(match.roomId);
      const room = roomManager.getRoom(match.roomId)!;
      const started: SpectateStartedMessage = {
        type: 'spectateStarted',
        data: {
          match: { ...match, spectators: spectatorCount(match.roomId) },
          config: room.config,
          gameState: room.gameServer?.getGameState() ?? null,
          ...(room.party ? { party: { players: room.party.seats, state: room.party.engine.getState() } } : {}),
        },
        timestamp: Date.now(),
      };
      adapter.send(JSON.stringify(started));
      return;
    }
    if (data.type === 'stopSpectating') {
      leaveWatch();
      return;
    }
    // playing yourself ends watching
    if (watching && (data.type === 'joinQueue' || data.type === 'createRoom' || data.type === 'joinRoom')) leaveWatch();

    if (data.type === 'connection') {
      if (currentPlayer) return;
      currentPlayer = messageHandler.handleConnection(data, adapter, user);
      return;
    }
    if (!currentPlayer) return;

    try {
      messageHandler.routeMessage(data, currentPlayer);
    } catch (err) {
      log.error({ err }, 'error while handling socket message');
    }
  });

  socket.on('disconnect', () => {
    clearInterval(recheck);
    hall.leave(socket, user);
    // Socket.IO already removed this socket from its rooms: just update the count
    if (watching) announceSpectators(watching);
    // Compare with this connection's adapter: after a rejoin the player has a newer socket
    if (currentPlayer && (roomManager.getPlayer(currentPlayer.id)?.socket as unknown) === adapter) {
      messageHandler.handleSocketClosed(currentPlayer);
    }
    currentPlayer = null;

    socketClosed(user.id);
  });
});

tickSystem.startTickSystem();
void resetAllPresence().then((ok) => {
  if (!ok) server.log.warn('could not reset presence on boot (users service unreachable)');
});

server.listen({ port: config.port, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
