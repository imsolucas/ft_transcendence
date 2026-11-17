import type { FastifyInstance } from "fastify";
import type { ServiceState, ServiceStatus, StatusReport } from "../../../../shared/types/api.types.ts";
import { prisma } from "../../db/client.ts";
import { config } from "../../config.ts";

const CACHE_MS = 5_000;
const SLOW_MS = 1_000;
let cached: { at: number; report: Promise<StatusReport> } | null = null;

async function timed(name: ServiceStatus["name"], probe: () => Promise<unknown>): Promise<ServiceStatus> {
  const started = performance.now();
  try {
    await probe();
    const latencyMs = Math.round(performance.now() - started);
    return { name, state: latencyMs > SLOW_MS ? "degraded" : "up", latencyMs };
  } catch {
    return { name, state: "down", latencyMs: null };
  }
}

const pingDb = () => prisma.$queryRaw`SELECT 1`;
const pingGame = async () => {
  const res = await fetch(`${config.gameInternalUrl}/health`, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error(`game ${res.status}`);
};

async function buildReport(): Promise<StatusReport> {
  const services = await Promise.all([timed("api", async () => {}), timed("database", pingDb), timed("game", pingGame)]);
  const overall: ServiceState = services.some((s) => s.state === "down")
    ? "down"
    : services.some((s) => s.state === "degraded")
      ? "degraded"
      : "up";
  return { overall, services, checkedAt: new Date().toISOString(), uptimeSeconds: Math.round(process.uptime()) };
}

/** Public status (cached so it can't be used to hammer the database). */
export default async function statusRoutes(app: FastifyInstance) {
  app.get("/status", async (_req, reply) => {
    // cache the in-flight check too, so concurrent requests share one database ping
    if (!cached || Date.now() - cached.at > CACHE_MS) cached = { at: Date.now(), report: buildReport() };
    reply.header("Cache-Control", "no-store");
    return await cached.report;
  });
}

/** Container health: the service is only healthy when it can reach its database. */
export async function healthWithDb() {
  try {
    await pingDb();
    return true;
  } catch {
    return false;
  }
}
