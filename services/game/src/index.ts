import fastify from 'fastify'
import ws from '@fastify/websocket'
import type {
  ConnectionMessage,
  ConnectionSuccessMessage,
  ConnectionErrorMessage,
  GameMessage
} from './types/protocol.types.js';
import type { Player } from './types/player.types.js';
import { InMemoryPlayerStorage } from './storage/playerStorage.js';

const server = fastify()
const playerStorage = new InMemoryPlayerStorage();

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
    console.log('Connection type:', typeof connection);
    console.log('Connection keys:', Object.keys(connection));

    let currentPlayer: Player | null = null;

    // Use 'connection' directly, not 'connection.socket'
    connection.on('message', (message: any) => {
      // try catch for JSON parsing
      try {
      const data: GameMessage = JSON.parse(message.toString());

      switch (data.type) {
        case "connection":
          console.log(`Player "${data.data.playerName}" wants to connect.`);

          const playerID = 'player_' + Math.random().toString(36).substring(2, 5);

          // make new player object
          const newPlayer: Player = {
            id: playerID,
            name: data.data.playerName,
            socket: connection,
            roomID: 'default',
            connectedAt: Date.now()
          };

          // add to storage
          playerStorage.add(newPlayer);
          currentPlayer = newPlayer;

          // create connection success object
          const response: ConnectionSuccessMessage = {
            type: 'connectionSuccess',
            data: {
              playerID: playerID,
              roomID: 'default',
              position: 1
            },
            timestamp: Date.now()
          };

          // send to client
          connection.send(JSON.stringify(response));
          console.log(`Player "${data.data.playerName}": ${playerID} connected successfully.`);
          console.log(`Total players online: ${playerStorage.getInRoom('default')}`);
          break;
        default:
          const errorMsg = 'Unknown message type.';
          sendError(connection, errorMsg);
          console.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'JSON parse error.';
      sendError(connection, errorMsg);
      console.error(errorMsg, error);
    }
  });

  connection.on('close', () => {
    if (currentPlayer) {
      playerStorage.remove(currentPlayer.id);
      console.log(`Player "${currentPlayer.name}" (${currentPlayer.id}) disconnected`);
      currentPlayer = null;
    } else {
      console.log('Unknown player disconnected');
    }
    console.log(`Total players online: ${playerStorage.getInRoom('default')}`);
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

function sendError(socket: WebSocket, message: string) {
  const errorResponse: ConnectionErrorMessage = {
    type: 'connectionError',
    data: { message },
    timestamp: Date.now()
  };
  socket.send(JSON.stringify(errorResponse));
}