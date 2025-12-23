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
import TournamentService from './websocket/TournamentService.js';


const server = fastify()
const playerStorage = new InMemoryPlayerStorage();
const roomManager = new RoomManager(playerStorage);
const broadcaster = new MessageBroadcaster(roomManager);
const tournamentService = new TournamentService(roomManager, broadcaster);
const messageHandler = new NewMessageHandler(roomManager);
const tickSystem = new TickSytem(roomManager, tournamentService, broadcaster);

await server.register(ws);

server.register(import('@fastify/cors'), {
  origin: true,
  credentials: true,
  methods: ["GET"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
})

server.get('/ping', async (request: any, reply: any) => {
  return 'pong\n';
});

server.get('/health', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/json');
  return {
    status: 'healthy',
    service: 'game',
    timestamp: new Date().toISOString()
  };
});

server.get('/rooms', async (request: any, reply: any) => {
  reply.header('Content-Type', 'text/plain');
  const rooms = roomManager.getAllRooms();
  
  let output = '';
  rooms.forEach((room, index) => {
    output += `Room ${index + 1}:\n`;
    Object.entries(room).forEach(([key, value]) => {
      output += `  ${key}: ${JSON.stringify(value)}\n`;
    });
    output += '\n';
  });
  
  return output || 'No rooms available\n';
})

server.get('/ws/game', { websocket: true }, (connection: any, req: any) => {
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

tickSystem.startTickSystem();

server.listen({ port: Number(process.env.PORT), host: '0.0.0.0'}, (err: any, address: any) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})