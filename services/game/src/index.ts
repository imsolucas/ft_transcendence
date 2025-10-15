import fastify from 'fastify'
import ws from '@fastify/websocket'

const server = fastify()

server.register(ws);

server.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
})

server.get('/ping', async (request, reply) => {
  return 'pong\n';
})

server.get('/was/game', { websocket: true }, (socket /* WebSocket */, req /* FastifyRequest */) => {
  socket.on('message', message => {
    // message.toString() === 'hi from client'
    socket.send('hi from server')
  })
})


server.listen({ port: 3001, host: '0.0.0.0'}, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})