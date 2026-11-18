/**
 * Process-wide logger for code that runs outside a request (Better Auth callbacks, startup
 * jobs). app.ts points it at Fastify's pino logger; before that it drops messages.
 */
type Log = { info: (o: object, m: string) => void; error: (o: object, m: string) => void };
let current: Log = { info: () => {}, error: () => {} };

export const log: Log = {
  info: (o, m) => current.info(o, m),
  error: (o, m) => current.error(o, m),
};

export function setLogger(l: Log) {
  current = l;
}
