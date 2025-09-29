import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import Database from "better-sqlite3";

async function dbPlugin(fastify: FastifyInstance) {
  const db = new Database("./db/data.sqlite");
  db.pragma("journal_mode = WAL");

  fastify.decorate("db", db);

  fastify.addHook("onClose", async (instance) => {
    try {
      instance.db.close();
      fastify.log.info("SQLite database closed");
    } catch (err) {
      fastify.log.error(err);
    }
  });
}

export default fp(dbPlugin);
