import fastify from 'fastify';
import ws from '@fastify/websocket';
import type { GameMessage } from 'shared';
import type { Player } from 'shared';
import { InMemoryPlayerStorage } from './storage/playerStorage.js';
import { InMemoryRoomStorage } from './storage/roomStorage.js';
import { MessageBroadcaster } from './websocket/broadcaster.js';
import { RoomManager } from './game/roomManager.js';
import { GameRoomManager } from './game/GameRoomManager.js';
import { MessageHandler } from './websocket/handlers.js';


const server = fastify()
const playerStorage = new InMemoryPlayerStorage();
const roomStorage = new InMemoryRoomStorage();
const roomManager = new RoomManager(playerStorage, roomStorage);
const gameRoomManager = new GameRoomManager();
roomManager.setGameRoomManager(gameRoomManager);
const broadcaster = new MessageBroadcaster(roomManager);
const messageHandler = new MessageHandler(roomManager, broadcaster);

server.register(ws);

// --- DEV ONLY: Create a test room in 'playing' state with 2 players so tick is always visible ---
// const testRoom = roomStorage.createRoom();
// testRoom.status = 'playing';
// testRoom.playerIds = ['p1', 'p2'];
// const dummySocket = {} as WebSocket;
// const now = Date.now();
// playerStorage.add({ id: 'p1', name: 'TestPlayer1', roomId: testRoom.id, position: 1, socket: dummySocket, connectedAt: now, isReady: true });
// playerStorage.add({ id: 'p2', name: 'TestPlayer2', roomId: testRoom.id, position: 2, socket: dummySocket, connectedAt: now, isReady: true });
// --- END DEV ONLY ---

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
            if (currentPlayer && data.type === "playerReady") {
              messageHandler.handlePlayerReady(data, currentPlayer);
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

function startTickSystem(roomManager: RoomManager, gameRoomManager: GameRoomManager): void {
  const TICK_RATE = 60; // ticks per second
  const TICK_INTERVAL = 1000 / TICK_RATE; // ms per tick

  // If already running, stop the previous interval
  if (tickInterval)
    clearInterval(tickInterval);

  tickInterval = setInterval(() => {
    const activeRooms = roomManager.getActiveRooms();
    const activeGameRooms = gameRoomManager.getActiveGameRooms(activeRooms);
    for (const gameRoom of activeGameRooms) {
      gameRoom.tick();
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

startTickSystem(roomManager, gameRoomManager);

server.listen({ port: 3001, host: '0.0.0.0'}, (err: any, address: any) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})