import fastify from 'fastify';
import ws from '@fastify/websocket';
import type { GameMessage } from 'shared';
import type { Player } from 'shared';
import { InMemoryPlayerStorage } from './storage/playerStorage.js';
import { InMemoryRoomStorage } from './storage/roomStorage.js';
import { MessageBroadcaster } from './websocket/broadcaster.js';
import { RoomManager } from './game/roomManager.js';
// Removed GameRoomManager import
import { MessageHandler } from './websocket/handlers.js';
import type { GameServer } from './game/GameServer.js';


const server = fastify()
const playerStorage = new InMemoryPlayerStorage();
const roomStorage = new InMemoryRoomStorage();
const roomManager = new RoomManager(playerStorage, roomStorage);
// Removed GameRoomManager instance and setGameRoomManager
const broadcaster = new MessageBroadcaster(roomManager);
const messageHandler = new MessageHandler(roomManager, broadcaster);
export const pongSessions = new Map<string, GameServer>();

server.register(ws);

server.addHook('onRequest', async (request: any, reply: any) => {
  reply.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  console.log('Incoming request:', request.method, request.url);
});

server.get('/ping', async (request: any, reply: any) => {
  return 'pong\n';
});

server.register(async function (fastify: any) {
  fastify.get('/ws/game', { websocket: true }, (connection: any, req: any) => {
    console.log('WebSocket connection established');

    let currentPlayer: Player | null = null;

    connection.on('message', (message: any) => {
      try {
        const data: GameMessage = JSON.parse(message.toString());

        switch (data.type) {
          case "connection":
            currentPlayer = messageHandler.handleConnection(data, connection);
            break;
          case "joinQueue":
            if (currentPlayer) {
              messageHandler.handleJoinQueue(data, connection);
            }
            break;
          case "leaveRoom":
            if (currentPlayer) {
              messageHandler.handleDisconnection(currentPlayer);
            }
            break;
          case "playerReady":
            if (currentPlayer) {
              messageHandler.handlePlayerReady(data, currentPlayer);
            }
            break;
          case 'playerInput':
            if (currentPlayer) {
              messageHandler.handlePlayerInput(data, currentPlayer);
            }
            break;
          default:
            console.error('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('JSON parse error:', error);
      }
    });

    connection.on('close', () => {
      if (currentPlayer) {
        messageHandler.handleDisconnection(currentPlayer);
        roomManager.removePlayer(currentPlayer.id);
        currentPlayer = null;
      } else {
        console.log('Unknown player disconnected');
      }
    });
  });
});


// Holds the interval ID so we can clear it later
let tickInterval: NodeJS.Timeout | null = null;

function startTickSystem(roomManager: RoomManager, pongSessions: Map<string, GameServer>): void {
  const TICK_RATE = 1; // ticks per second
  const TICK_INTERVAL = 1000 / TICK_RATE; // ms per tick

  // If already running, stop the previous interval
  if (tickInterval)
    clearInterval(tickInterval);

  tickInterval = setInterval(() => {
    // For each active room, tick its PongSession if it exists
    const activeRooms = roomManager.getActiveRooms();
    for (const room of activeRooms) {
      const session = pongSessions.get(room.id);
      if (session) {
        session.tick();
      }
    }
  }, TICK_INTERVAL);
}


//Call this to pause the game loop or during server shutdown/tests.
function stopTickSystem(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

startTickSystem(roomManager, pongSessions);

server.listen({ port: 3001, host: '0.0.0.0'}, (err: any, address: any) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})