// Prometheus metrics for the game service, served at GET /metrics on the internal port only
// (Caddy routes just /ws* here). Labels are fixed small sets: no room ids, user ids or URLs.
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();
registry.setDefaultLabels({ service: 'game' });
collectDefaultMetrics({ register: registry });

const ROOM_STATUSES = ['waiting', 'full', 'playing', 'finished'] as const;
const ROOM_MODES = ['standard', 'tournament', 'party'] as const;

export const matchesFinished = new Counter({
  name: 'game_matches_finished_total',
  help: 'Matches that ended (each tournament round counts as one match), by mode',
  labelNames: ['mode'] as const,
  registers: [registry],
});
for (const mode of ROOM_MODES) matchesFinished.inc({ mode }, 0);

export const resultReportsFailed = new Counter({
  name: 'game_result_reports_failed_total',
  help: 'Match/tournament results dropped after every retry (or rejected) by the users service',
  labelNames: ['kind'] as const,
  registers: [registry],
});
// start every label at 0 so increase() sees the first event after a restart
for (const kind of ['match', 'tournament']) resultReportsFailed.inc({ kind }, 0);

// One tick simulates every playing room; the budget at 60 Hz is ~16.7 ms.
export const tickDuration = new Histogram({
  name: 'game_tick_duration_seconds',
  help: 'Time spent in one simulation tick (all playing rooms)',
  buckets: [0.0001, 0.00025, 0.0005, 0.001, 0.0025, 0.005, 0.01, 0.0167, 0.025, 0.05, 0.1],
  registers: [registry],
});

type Sources = {
  connectedSockets: () => number;
  rooms: () => { status: string; mode: string }[];
  queueLengths: () => { standard: number; tournament: number; party: number };
};

/** Wires the gauges to live state; values are read at scrape time, so nothing to keep in sync. */
export function registerGameGauges(src: Sources): void {
  new Gauge({
    name: 'game_connected_sockets',
    help: 'Authenticated Socket.IO connections',
    registers: [registry],
    collect() {
      this.set(src.connectedSockets());
    },
  });

  new Gauge({
    name: 'game_rooms',
    help: 'Rooms currently held in memory, by status and mode',
    labelNames: ['status', 'mode'] as const,
    registers: [registry],
    collect() {
      const counts = new Map<string, number>();
      for (const r of src.rooms()) counts.set(`${r.status}|${r.mode}`, (counts.get(`${r.status}|${r.mode}`) ?? 0) + 1);
      // set every combination (zeros included) so a label value never goes stale
      for (const status of ROOM_STATUSES)
        for (const mode of ROOM_MODES) this.set({ status, mode }, counts.get(`${status}|${mode}`) ?? 0);
    },
  });

  new Gauge({
    name: 'game_queue_players',
    help: 'Players waiting in matchmaking, by mode',
    labelNames: ['mode'] as const,
    registers: [registry],
    collect() {
      const q = src.queueLengths();
      this.set({ mode: 'standard' }, q.standard);
      this.set({ mode: 'tournament' }, q.tournament);
      this.set({ mode: 'party' }, q.party);
    },
  });
}
