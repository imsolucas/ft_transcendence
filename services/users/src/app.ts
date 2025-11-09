import Fastify  from "fastify";
import type { FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { UserProfile, FriendRequest, MatchHistory } from "./schemas/index.ts";
import dbPlugin from "./db/plugin.ts";
import routes from "./routes/routes.ts";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // Register CORS plugin
  await app.register(import("@fastify/cors"), {
    origin: [
      "http://localhost:3000",  // Frontend dev server
      "http://127.0.0.1:3000",  // Alternative localhost
      "http://localhost:5173",  // Vite default port (fallback)
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

 // Register Swagger
  await app.register(require('@fastify/swagger'), {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'User Management System',
        version: '1.0.0'
      },
      servers: [
        {
          url: 'http://localhost:4000'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        },
        schemas: {
          UserProfile: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              username: { type: 'string', example: 'Alice' },
              email: { type: 'string', format: 'email', example: 'alice@example.com' },
              avatar: { type: 'string', format: 'uri', example: 'https://example.com/avatar.png' }
            }
          },
          FriendRequest: {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              fromId: { type: 'integer', example: 1 },
              toId: { type: 'integer', example: 2 },
              status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'REJECTED'] },
              created_at: { type: 'string', format: 'date-time', example: '2025-11-06T10:30:00Z' }
            }
          },
          MatchHistory: {
            type: 'object',
            properties: {
              matchId: { type: 'integer', example: 42 },
              player1Id: { type: 'integer', example: 1 },
              player2Id: { type: 'integer', example: 2 },
              player1DisplayName: { type: 'string', example: 'Alice' },
              player2DisplayName: { type: 'string', example: 'Bob' },
              player1Score: { type: 'integer', example: 10 },
              player2Score: { type: 'integer', example: 8 },
              played_at: { type: 'string', format: 'date-time', example: '2025-11-06T10:30:00Z' },
              end_at: { type: 'string', format: 'date-time', example: '2025-11-06T10:40:00Z' }
            }
          }
        },
        responses: {
          UnauthorizedError: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: {
                      type: 'string',
                      example: 'Unauthorized'
                    }
                  }
                }
              }
            },
            InternalServerError: {
              description: 'Internal server error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: {
                        type: 'string',
                        example: 'Internal Server Error'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
    }
  });

  // Serve Swagger UI
  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false
    },
    // Optional: customize the title of the docs
    transformSpecification: (swaggerObject) => {
      return swaggerObject;
    },
    transformSpecificationClone: true
  });

  // Add schemas to Fastify instance
  app.addSchema(UserProfile);
  app.addSchema(FriendRequest);
  app.addSchema(MatchHistory);

  await app.register(dbPlugin);

  await app.register(routes);
  app.get("/", async () => "Hello TypeScript + Fastify! 🟦");

  return app;
};
