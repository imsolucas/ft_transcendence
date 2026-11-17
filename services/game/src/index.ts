import fastify from 'fastify';
import { Server, type Socket } from 'socket.io';
import type { GameMessage } from 'shared';
import type { Player } from 'shared';
import { config } from './config.js';
import { resolveSession, setPresence, type AuthenticatedUser } from './auth/usersClient.js';
import { InMemoryPlayerStorage } from './storage/playerStorage.js';
import { MessageBroadcaster } from './websocket/Broadcaster.js';
import { RoomManager } from './game/roomManager.js';
import NewMessageHandler from './websocket/MessageHandler.js';
import TickSytem from './websocket/TickSystem.js';
import TournamentService from './websocket/TournamentService.js';
import { setReportLogger } from './utils/reportResults.js';

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

// Authenticate every socket from its session cookie before it is accepted
io.use(async (socket, next) => {
  const user = await resolveSession(socket.handshake.headers.cookie);
  if (!user) return next(new Error('UNAUTHORIZED'));
  socket.data.user = user;
  next();
});

// userId -> number of live sockets, for presence
const liveSockets = new Map<number, number>();

io.on('connection', (socket) => {
  const user = socket.data.user as AuthenticatedUser;
  const log = server.log.child({ userId: user.id, socketId: socket.id });
  const adapter = new SocketAdapter(socket);
  let currentPlayer: Player | null = null;

  const count = (liveSockets.get(user.id) ?? 0) + 1;
  liveSockets.set(user.id, count);
  if (count === 1) void setPresence(user.id, 'ONLINE');

  // Per-socket rate limit (fixed one-second window)
  let windowStart = Date.now();
  let messagesInWindow = 0;

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
    if (currentPlayer && roomManager.getPlayer(currentPlayer.id)?.socket === currentPlayer.socket) {
      messageHandler.handleDisconnection(currentPlayer);
      roomManager.removePlayer(currentPlayer.id);
    }
    currentPlayer = null;

    const left = (liveSockets.get(user.id) ?? 1) - 1;
    if (left <= 0) {
      liveSockets.delete(user.id);
      void setPresence(user.id, 'OFFLINE');
    } else {
      liveSockets.set(user.id, left);
    }
  });
});

tickSystem.startTickSystem();

server.listen({ port: config.port, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
