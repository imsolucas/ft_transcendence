import fastify from 'fastify';
import { Server, type Socket } from 'socket.io';
import type { GameMessage } from 'shared';
import type { Player } from 'shared';
import { config } from './config.ts';
import { resolveSession, type AuthenticatedUser } from './auth/usersClient.ts';
import { resetAllPresence, socketClosed, socketCount, socketOpened } from './presence.ts';
import { InMemoryPlayerStorage } from './storage/playerStorage.ts';
import { MessageBroadcaster } from './websocket/Broadcaster.ts';
import { RoomManager } from './game/roomManager.ts';
import NewMessageHandler from './websocket/MessageHandler.ts';
import TickSytem from './websocket/TickSystem.ts';
import TournamentService from './websocket/TournamentService.ts';
import { setReportLogger } from './utils/reportResults.ts';
import crypto from 'node:crypto';
import { registerGameGauges, registry } from './metrics.ts';

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

const playerStorage = new InMemoryPlayerStorage();
const roomManager = new RoomManager(playerStorage);
const broadcaster = new MessageBroadcaster(roomManager);
const tournamentService = new TournamentService(roomManager, broadcaster);
const messageHandler = new NewMessageHandler(roomManager);
const tickSystem = new TickSytem(roomManager, tournamentService, broadcaster);

server.get('/health', async () => ({ status: 'healthy', service: 'game', timestamp: new Date().toISOString() }));

// Prometheus scrape target. Internal port only: Caddy routes just /ws* to this service, and a
// request carrying X-Forwarded-For came through a proxy, so it is refused as well.
server.get('/metrics', async (req, reply) => {
  if (req.headers['x-forwarded-for']) return reply.code(404).send({ error: 'Not found' });
  return reply.header('content-type', registry.contentType).send(await registry.metrics());
});

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
    // Compare with this connection's adapter: after a rejoin the player has a newer socket
    if (currentPlayer && (roomManager.getPlayer(currentPlayer.id)?.socket as unknown) === adapter) {
      messageHandler.handleSocketClosed(currentPlayer);
    }
    currentPlayer = null;

    socketClosed(user.id);
  });
});

registerGameGauges({
  connectedSockets: () => io.of('/').sockets.size,
  rooms: () => roomManager.getAllRooms(),
  queueLengths: () => messageHandler.queueLengths(),
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
