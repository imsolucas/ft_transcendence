import fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import ws from '@fastify/websocket';
import type { GameMessage } from 'shared';
import type { Player } from 'shared';
import { config } from './config.js';
import { isAllowedOrigin, readAccessCookie, verifyAccessToken, type AuthenticatedUser } from './auth/accessToken.js';
import { InMemoryPlayerStorage } from './storage/playerStorage.js';
import { MessageBroadcaster } from './websocket/Broadcaster.js';
import { RoomManager } from './game/roomManager.js';
import NewMessageHandler from './websocket/MessageHandler.js';
import TickSytem from './websocket/TickSystem.js';
import TournamentService from './websocket/TournamentService.js';
import { setReportLogger } from './utils/reportResults.js';

declare module 'fastify' {
  interface FastifyRequest {
    wsUser?: AuthenticatedUser;
  }
}

const HEARTBEAT_INTERVAL_MS = 15_000;

const server = fastify({ logger: true, trustProxy: 1 });
setReportLogger(server.log);
const playerStorage = new InMemoryPlayerStorage();
const roomManager = new RoomManager(playerStorage);
const broadcaster = new MessageBroadcaster(roomManager);
const tournamentService = new TournamentService(roomManager, broadcaster);
const messageHandler = new NewMessageHandler(roomManager);
const tickSystem = new TickSytem(roomManager, tournamentService, broadcaster);

await server.register(ws, {
  options: { maxPayload: config.ws.maxPayloadBytes },
});

await server.register(import('@fastify/cors'), {
  origin: (origin, cb) => cb(null, !origin || config.allowedOrigins.includes(origin)),
  credentials: true,
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
});

server.get('/ping', async () => 'pong\n');

server.get('/health', async (_request, reply) => {
  reply.header('Content-Type', 'application/json');
  return {
    status: 'healthy',
    service: 'game',
    timestamp: new Date().toISOString(),
  };
});

/** Runs before the WebSocket upgrade: refuse unauthenticated or cross-site sockets. */
async function authenticateUpgrade(req: FastifyRequest, reply: FastifyReply) {
  if (!isAllowedOrigin(req.headers.origin)) {
    req.log.warn({ origin: req.headers.origin }, '[security] WS upgrade from disallowed origin');
    return reply.code(403).send({ error: 'Forbidden' });
  }
  const token = readAccessCookie(req.headers.cookie);
  const user = token ? verifyAccessToken(token) : null;
  if (!user) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  req.wsUser = user;
}

server.get('/ws/game', { websocket: true, preValidation: authenticateUpgrade }, (connection, req) => {
  const user = req.wsUser!;
  const log = req.log.child({ userId: user.id });
  log.info('WebSocket connection established');

  let currentPlayer: Player | null = null;

  // Per-connection rate limit (fixed one-second window)
  let windowStart = Date.now();
  let messagesInWindow = 0;

  // Auth is checked once at upgrade; an established socket outlives its access token so a
  // match isn't cut off when the 15-minute token expires.

  // Liveness: a socket that misses a pong is terminated, so a half-open connection (sleeping
  // laptop, dropped Wi-Fi) can't hold the player's slot and block a reconnect.
  let alive = true;
  connection.on('pong', () => {
    alive = true;
  });
  const heartbeat = setInterval(() => {
    if (!alive) {
      log.info('WS heartbeat missed; terminating');
      connection.terminate();
      return;
    }
    alive = false;
    connection.ping();
  }, HEARTBEAT_INTERVAL_MS);

  connection.on('message', (raw: Buffer) => {
    const now = Date.now();
    if (now - windowStart >= 1000) {
      windowStart = now;
      messagesInWindow = 0;
    }
    if (++messagesInWindow > config.ws.maxMessagesPerSecond) {
      log.warn('[security] WS message rate exceeded; closing');
      connection.close(1008, 'Rate limit exceeded');
      return;
    }

    let data: GameMessage;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      log.debug('dropping non-JSON WS frame');
      return;
    }
    if (!data || typeof data !== 'object' || typeof (data as { type?: unknown }).type !== 'string') {
      log.debug('dropping WS frame without a type');
      return;
    }

    if (data.type === 'connection') {
      if (currentPlayer) return; // already registered on this socket
      currentPlayer = messageHandler.handleConnection(data, connection, user);
      return;
    }

    if (!currentPlayer) {
      log.debug('dropping WS message before connection handshake');
      return;
    }

    try {
      messageHandler.routeMessage(data, currentPlayer);
    } catch (err) {
      log.error({ err }, 'error while handling WS message');
    }
  });

  connection.on('close', () => {
    clearInterval(heartbeat);
    if (!currentPlayer) return;
    // Only clean up if this socket still owns the player entry (a second tab is refused,
    // but never let one socket's close evict another socket's player).
    if (roomManager.getPlayer(currentPlayer.id)?.socket === currentPlayer.socket) {
      messageHandler.handleDisconnection(currentPlayer);
      roomManager.removePlayer(currentPlayer.id);
    }
    currentPlayer = null;
  });
});

tickSystem.startTickSystem();

server.listen({ port: config.port, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
