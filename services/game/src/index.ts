import fastify from 'fastify'
import ws from '@fastify/websocket'
import type { GameMessage } from './types/protocol.types.js';
import type { Player } from './types/player.types.js';
import { InMemoryPlayerStorage } from './storage/playerStorage.js';
import { MessageBroadcaster } from './websocket/broadcaster.js';
import { RoomManager } from './game/roomManager.js';
import { MessageHandler } from './websocket/handlers.js';

const server = fastify()
const playerStorage = new InMemoryPlayerStorage();
const broadcaster = new MessageBroadcaster(playerStorage);
const roomManager = new RoomManager(playerStorage);
const messageHandler = new MessageHandler(roomManager, broadcaster, playerStorage);

server.register(ws);

server.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  console.log('Incoming request:', request.method, request.url);
})

server.get('/ping', async (request, reply) => {
  return 'pong\n';
})

server.register(async function (fastify) {
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
          case "playerReady":
            if (currentPlayer) {
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
        currentPlayer = null;
      } else {
        console.log('Unknown player disconnected');
      }
    });
  })
})

server.listen({ port: 3001, host: '0.0.0.0'}, (err: any, address: any) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})