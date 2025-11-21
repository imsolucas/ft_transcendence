import fastify from 'fastify';
import ws from '@fastify/websocket';
import type { GameMessage } from 'shared';
import type { Player } from 'shared';
import { InMemoryPlayerStorage } from './storage/playerStorage.js';
import { MessageBroadcaster } from './websocket/Broadcaster.js';
import { RoomManager } from './game/roomManager.js';
import NewMessageHandler from './websocket/MessageHandler.js';
import type { GameServer } from './game/GameServer.js';
// import TickSytem from './websocket/TickSystem.js';
import TickSytem from './websocket/TickSystem.js';


const server = fastify()
const playerStorage = new InMemoryPlayerStorage();
const roomManager = new RoomManager(playerStorage);
const broadcaster = new MessageBroadcaster(roomManager);
const messageHandler = new NewMessageHandler(roomManager);
const tickSystem = new TickSytem(roomManager);
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

        // Handle connection separately to establish player
        if (data.type === "connection") {
          currentPlayer = messageHandler.handleConnection(data, connection);
          return;
        }

        // For all other messages, check if player exists once
        if (!currentPlayer) {
          console.error('No player associated with connection');
          return;
        }

        // Use unified message router - single entry point for all authenticated messages
        messageHandler.routeMessage(data, currentPlayer);
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

tickSystem.startTickSystem();

server.listen({ port: 3001, host: '0.0.0.0'}, (err: any, address: any) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})