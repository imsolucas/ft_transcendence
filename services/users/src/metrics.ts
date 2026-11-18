// Prometheus metrics for the users service, served at GET /metrics on the internal port only.
// Caddy routes /api/* here, never /metrics. Labels stay bounded: the route *pattern*
// (e.g. /api/users/:id), never the raw URL, and the status code.
import type { FastifyInstance } from "fastify";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();
registry.setDefaultLabels({ service: "users" });
collectDefaultMetrics({ register: registry });

const httpRequests = new Counter({
  name: "http_requests_total",
  help: "HTTP requests handled, by method, route pattern and status code",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
});

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration, by method and route pattern",
  labelNames: ["method", "route"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const signUps = new Counter({
  name: "users_signups_total",
  help: "Accounts created (email/password or Google)",
  registers: [registry],
});

export const resultsRecorded = new Counter({
  name: "users_game_results_recorded_total",
  help: "Results stored from the game service (duplicates from retries are not counted), by kind",
  labelNames: ["kind"] as const,
  registers: [registry],
});

const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

/** Records every response; call on the root instance before routes are registered. */
export function registerHttpMetrics(app: FastifyInstance): void {
  app.addHook("onResponse", async (req, reply) => {
    // 404s have no route: one constant label instead of the attacker-chosen URL
    const route = req.routeOptions.url ?? "unmatched";
    if (route === "/metrics") return;
    const method = METHODS.has(req.method) ? req.method : "OTHER";
    httpRequests.inc({ method, route, status: String(reply.statusCode) });
    httpDuration.observe({ method, route }, reply.elapsedTime / 1000);
  });

  // A request carrying X-Forwarded-For came through Caddy: refuse it (defence in depth;
  // Caddy has no route to /metrics anyway).
  app.get("/metrics", { schema: { hide: true } }, async (req, reply) => {
    if (req.headers["x-forwarded-for"]) return reply.code(404).send({ error: "Not found" });
    return reply.header("content-type", registry.contentType).send(await registry.metrics());
  });
}
