import "fastify";
import type Database from "better-sqlite3";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
  }

  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      email?: string;
      // add other fields your auth populates
    };
  }
}
