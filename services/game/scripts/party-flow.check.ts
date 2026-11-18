// Headless end-to-end check of party mode against a real game server process: a stub users
// service (sessions by cookie, presence, result capture), N Socket.IO clients and a spectator.
// No docker, no database. Uses socket.io-client from apps/web (it is not a game dependency).
// Run from services/game: npm run party:flow   (takes ~45 s: the 15 s queue wait and the 15 s grace)
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import http from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";

const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
type ClientSocket = { on(ev: string, fn: (...args: any[]) => void): void; emit(ev: string, ...args: unknown[]): void; disconnect(): void };
const { io } = require("socket.io-client") as { io: (url: string, opts: Record<string, unknown>) => ClientSocket };

const ORIGIN = "https://localhost:8443";
const TOKEN = crypto.randomBytes(48).toString("base64");

// ---------------------------------------------------------------- stub users service
const partyResults: any[] = [];
const stub = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) {
      res.writeHead(401).end();
      return;
    }
    if (req.url === "/internal/session") {
      const m = /uid=(\d+)/.exec(JSON.parse(body).cookie ?? "");
      if (!m) return void res.writeHead(401).end();
      const id = Number(m[1]);
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ user: { id, username: `u${id}`, displayName: `Player ${id}`, avatar: null } }));
      return;
    }
    if (req.url === "/internal/game/party-result") {
      partyResults.push(JSON.parse(body));
      res.writeHead(201, { "content-type": "application/json" }).end('{"id":1}');
      return;
    }
    res.writeHead(204).end();
  });
});
await new Promise<void>((r) => stub.listen(0, "127.0.0.1", r));
const stubPort = (stub.address() as AddressInfo).port;

// ---------------------------------------------------------------- game server
const gamePort = 30000 + Math.floor(Math.random() * 20000);
const game = spawn("npx", ["tsx", "src/index.ts"], {
  env: { ...process.env, PORT: String(gamePort), PUBLIC_ORIGIN: ORIGIN, INTERNAL_SERVICE_TOKEN: TOKEN, USERS_API_URL: `http://127.0.0.1:${stubPort}`, LOG_LEVEL: "warn" },
  stdio: ["ignore", "inherit", "inherit"],
  // its own process group, so cleanup also stops the node process tsx starts
  detached: true,
});
const cleanup = () => {
  try {
    if (game.pid) process.kill(-game.pid, "SIGTERM");
  } catch {}
  stub.close();
};
process.on("exit", cleanup);
for (let i = 0; i < 100; i++) {
  try {
    if ((await fetch(`http://127.0.0.1:${gamePort}/health`)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

// ---------------------------------------------------------------- clients
type Msg = { type: string; data: any; timestamp: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Client {
  socket: ClientSocket;
  log: Msg[] = [];
  private waiters: { pred: (m: Msg) => boolean; resolve: (m: Msg) => void }[] = [];
  constructor(readonly uid: number) {
    this.socket = io(`http://127.0.0.1:${gamePort}`, {
      path: "/ws",
      transports: ["websocket"],
      extraHeaders: { origin: ORIGIN, cookie: `uid=${uid}` },
      reconnection: false,
    });
    this.socket.on("message", (raw: string) => {
      const m = JSON.parse(raw) as Msg;
      this.log.push(m);
      this.waiters = this.waiters.filter((w) => {
        if (!w.pred(m)) return true;
        w.resolve(m);
        return false;
      });
    });
    this.socket.on("connect", () => this.send("connection", { playerName: "", playerId: "", picture: "" }));
  }
  get id() {
    return String(this.uid);
  }
  send(type: string, data: unknown) {
    this.socket.emit("message", JSON.stringify({ type, data, timestamp: Date.now() }));
  }
  /** resolves with the first message (already received since `from`, or future) matching */
  wait(type: string, pred: (m: Msg) => boolean = () => true, timeoutMs = 5000, from = 0): Promise<Msg> {
    const seen = this.log.slice(from).find((m) => m.type === type && pred(m));
    if (seen) return Promise.resolve(seen);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`user ${this.uid}: no ${type} within ${timeoutMs} ms`)), timeoutMs);
      this.waiters.push({ pred: (m) => m.type === type && pred(m), resolve: (m) => (clearTimeout(t), resolve(m)) });
    });
  }
  close() {
    this.socket.disconnect();
  }
}

async function connect(uid: number) {
  const c = new Client(uid);
  await c.wait("connectionSuccess");
  return c;
}

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  process.stdout.write(`ok - ${name}\n`);
}

const lastState = (c: Client) => [...c.log].reverse().find((m) => m.type === "partyState")?.data.state;

try {
  // ================================================================ A: queue of 4
  const A = await Promise.all([1, 2, 3, 4].map(connect));
  let roomA = "";
  let seats: { id: string; seat: number }[] = [];
  const seatOf = (c: Client) => seats.find((s) => s.id === c.id)!.seat;

  await test("4 players in the party queue are matched into one room", async () => {
    for (const c of A) c.send("joinQueue", { roomType: "party" });
    const joined = await Promise.all(A.map((c) => c.wait("playerJoined", (m) => m.data.playersInRoom.length === 4)));
    roomA = joined[0]!.data.roomId;
    assert.ok(joined.every((m) => m.data.roomId === roomA));
  });

  await test("ready check: the party starts once all 4 are ready, with random seats", async () => {
    for (const c of A.slice(0, 3)) c.send("playerReady", { ready: true });
    await sleep(300);
    assert.ok(!A[0]!.log.some((m) => m.type === "partyStart"), "started before everyone was ready");
    A[3]!.send("playerReady", { ready: true });
    const starts = await Promise.all(A.map((c) => c.wait("partyStart")));
    seats = starts[0]!.data.players;
    assert.equal(seats.length, 4);
    assert.deepEqual(seats.map((s) => s.seat).sort(), [0, 1, 2, 3]);
    assert.deepEqual(seats.map((s) => s.id).sort(), ["1", "2", "3", "4"]);
    await A[0]!.wait("partyState");
  });

  await test("inputs: a player moves only their own paddle; positions from the client are ignored", async () => {
    const c = A[0]!;
    const mine = seatOf(c);
    const before = lastState(c).paddles.map((p: any) => p.pos);
    c.send("playerInput", { inputs: { left: false, right: true, up: false, down: false, action_1: false, action_2: false, pos: 5, x: 1 } });
    await sleep(300);
    c.send("playerInput", { inputs: { left: false, right: false } });
    await sleep(100);
    const after = lastState(c).paddles.map((p: any) => p.pos);
    assert.ok(after[mine] > before[mine], "own paddle did not move right");
    after.forEach((p: number, i: number) => i !== mine && assert.equal(p, before[i], `seat ${i} moved`));
  });

  const spectator = await connect(9);
  await test("spectators: the party is listed and its state is mirrored to watchers", async () => {
    spectator.send("liveMatches", {});
    const list = await spectator.wait("liveMatchesList");
    const m = list.data.matches.find((x: any) => x.roomId === roomA);
    assert.ok(m, "party not listed");
    assert.equal(m.mode, "party");
    assert.equal(m.players.length, 4);
    assert.equal(m.scores.length, 4, "lives per seat");
    spectator.send("spectate", { roomId: roomA });
    const started = await spectator.wait("spectateStarted");
    assert.equal(started.data.party.players.length, 4);
    await spectator.wait("partyState");
    // a seated player can't spectate their own party
    A[1]!.send("spectate", { roomId: roomA });
    await A[1]!.wait("Error", (m) => m.data.code === "SPECTATE_OWN_MATCH");
  });

  await test("forfeit: the player is out, their side becomes a wall, the game goes on", async () => {
    A[0]!.send("forfeit", {});
    await sleep(200);
    const s = lastState(A[1]!);
    assert.equal(s.paddles[seatOf(A[0]!)].alive, false);
    assert.equal(s.paddles[seatOf(A[0]!)].lives, 0);
    assert.equal(s.phase === "over", false);
  });

  let a2 = A[1]!;
  await test("disconnect: paused with a reconnect notice; rejoining restores the seat", async () => {
    const mark = A[2]!.log.length;
    a2.close();
    await A[2]!.wait("opponentReconnecting", (m) => m.data.playerId === "2", 3000, mark);
    await sleep(150);
    const step1 = lastState(A[2]!).step;
    await sleep(500);
    assert.equal(lastState(A[2]!).step, step1, "the party kept running while a player was away");
    a2 = new Client(2);
    await a2.wait("rejoined");
    const start = await a2.wait("partyStart");
    assert.equal(start.data.roomId, roomA);
    await A[2]!.wait("opponentReconnected", (m) => m.data.playerId === "2", 3000, mark);
    await sleep(300);
    assert.ok(lastState(A[2]!).step > step1, "the party did not resume");
  });

  await test("leaving mid-game knocks the leaver out; the last one standing wins; the result is reported", async () => {
    a2.send("leaveRoom", { playerName: "" });
    await sleep(200);
    assert.equal(lastState(A[2]!).paddles[seatOf(a2)].alive, false);
    A[2]!.send("forfeit", {});
    const end = await A[3]!.wait("partyEnd");
    assert.equal(end.data.winner.id, "4");
    assert.deepEqual(end.data.standings.map((s: any) => [s.id, s.place]), [["4", 1], ["3", 2], ["2", 3], ["1", 4]]);
    await spectator.wait("partyEnd");
    for (let i = 0; i < 20 && partyResults.length === 0; i++) await sleep(100);
    assert.equal(partyResults.length, 1);
    const r = partyResults[0];
    assert.equal(r.winnerId, 4);
    assert.equal(r.players.length, 4);
    assert.deepEqual(r.players.map((p: any) => [p.userId, p.placement]), [[4, 1], [3, 2], [2, 3], [1, 4]]);
    assert.ok(typeof r.matchId === "string" && r.matchId.length >= 8);
  });
  for (const c of [...A, a2, spectator]) c.close();
  await sleep(300);

  // ================================================================ B: queue of 3 waits ~15 s
  await test("3 queued players get a countdown and are matched after ~15 s", async () => {
    const B = await Promise.all([11, 12, 13].map(connect));
    for (const c of B) c.send("joinQueue", { roomType: "party" });
    const q = await B[0]!.wait("partyQueue", (m) => m.data.waiting === 3);
    assert.ok(q.data.startsAt > Date.now() + 10_000 && q.data.startsAt < Date.now() + 16_000);
    const t0 = Date.now();
    const joined = await Promise.all(B.map((c) => c.wait("playerJoined", (m) => m.data.playersInRoom.length === 3, 20_000)));
    assert.ok(Date.now() - t0 > 10_000, "matched too early");
    assert.ok(joined.every((m) => m.data.roomId === joined[0]!.data.roomId));
    for (const c of B) c.close();
  });
  await sleep(300);

  await test("leaving the queue below 3 cancels the countdown", async () => {
    const C = await Promise.all([21, 22, 23].map(connect));
    for (const c of C) c.send("joinQueue", { roomType: "party" });
    await C[0]!.wait("partyQueue", (m) => m.data.waiting === 3 && m.data.startsAt !== null);
    const mark = C[0]!.log.length;
    C[2]!.send("leaveQueue", { playerName: "" });
    const q = await C[0]!.wait("partyQueue", (m) => m.data.waiting === 2, 3000, mark);
    assert.equal(q.data.startsAt, null);
    for (const c of C) c.close();
  });
  await sleep(300);

  // ================================================================ C2: the unready one leaves
  await test("3 ready + the 4th (not ready) disconnects: the party starts with 3", async () => {
    const E = await Promise.all([41, 42, 43, 44].map(connect));
    for (const c of E) c.send("joinQueue", { roomType: "party" });
    await Promise.all(E.map((c) => c.wait("playerJoined", (m) => m.data.playersInRoom.length === 4)));
    for (const c of E.slice(0, 3)) c.send("playerReady", { ready: true });
    await sleep(200);
    E[3]!.close();
    const start = await E[0]!.wait("partyStart");
    assert.equal(start.data.players.length, 3);
    assert.ok(!start.data.players.some((p: any) => p.id === "44"));
    for (const c of E) c.close();
  });
  await sleep(300);

  // ================================================================ D: private room by code
  await test("private party by code: 3 friends, no mid-game join, reconnect timeout knocks out", async () => {
    const [host, f1, f2, late] = await Promise.all([31, 32, 33, 34].map(connect));
    // physics from the client is ignored (roomConfigFrom); mode party → a private party room
    host!.send("createRoom", { config: { mode: "party", isPrivate: false, ballConfig: { speed: 9999 }, seed: 1, numPlayers: 99 } });
    const created = await host!.wait("playerJoined");
    const code = created.data.roomId;
    // a party code doesn't join from the 1v1 form (no mode)
    late!.send("joinRoom", { roomId: code });
    await late!.wait("Error", (m) => m.data.code === "JOIN_FAILED");
    f1!.send("joinRoom", { roomId: code, mode: "party" });
    f2!.send("joinRoom", { roomId: code, mode: "party" });
    await host!.wait("playerJoined", (m) => m.data.playersInRoom.length === 3);
    for (const c of [host!, f1!, f2!]) c.send("playerReady", { ready: true });
    const start = await host!.wait("partyStart");
    assert.equal(start.data.players.length, 3);
    assert.equal(start.data.state.paddles.length, 3);
    // private: not listed for spectators
    late!.send("liveMatches", {});
    const list = await late!.wait("liveMatchesList");
    assert.ok(!list.data.matches.some((m: any) => m.roomId === code));
    // a 4th can't take the free seat of a party in play
    const errMark = late!.log.length;
    late!.send("joinRoom", { roomId: code, mode: "party" });
    await late!.wait("Error", (m) => m.data.code === "JOIN_FAILED", 5000, errMark);
    // f2 drops and never comes back: knocked out after the 15 s grace
    const seatF2 = start.data.players.find((p: any) => p.id === "33").seat;
    f2!.close();
    await host!.wait("opponentReconnecting", (m) => m.data.playerId === "33");
    await host!.wait("playerLeft", (m) => m.data.playerId === "33", 20_000);
    await sleep(200);
    const s = lastState(host!);
    assert.equal(s.paddles[seatF2].alive, false);
    assert.notEqual(s.phase, "over");
    const step = s.step;
    await sleep(300);
    assert.ok(lastState(host!).step > step, "not resumed after the timeout");
    for (const c of [host!, f1!, late!]) c.close();
  });

  process.stdout.write(`\n${passed} party flow checks passed\n`);
} catch (err) {
  process.stdout.write(`FAILED after ${passed} checks: ${(err as Error).stack}\n`);
  process.exitCode = 1;
} finally {
  cleanup();
  setTimeout(() => process.exit(), 200);
}
