// Contract tests for TournamentScores, run against an in-process EVM (@ethereumjs/evm):
// no node, no docker. Run with: npm run chain:test
// Covers: owner-only record, duplicate revert, getters, verify, enumeration, ownership
// transfer, and that the canonical hash used by the users service is stable.
import assert from "node:assert/strict";
import { createEVM } from "@ethereumjs/evm";
import { createAddressFromString } from "@ethereumjs/util";
import { Interface, getBytes, hexlify, keccak256, toUtf8Bytes } from "ethers";
import { TOURNAMENT_SCORES_ABI, TOURNAMENT_SCORES_BYTECODE } from "../../src/chain/artifact.ts";
import { canonicalResult, chainKey, recordFields, resultHash } from "../../src/chain/canonical.ts";
import type { TournamentHashRow } from "../../src/chain/canonical.ts";

const iface = new Interface(TOURNAMENT_SCORES_ABI);
const OWNER = createAddressFromString("0x1000000000000000000000000000000000000001");
const OTHER = createAddressFromString("0x2000000000000000000000000000000000000002");

const evm = await createEVM();
const deployed = await evm.runCall({ caller: OWNER, origin: OWNER, data: getBytes(TOURNAMENT_SCORES_BYTECODE), gasLimit: 10_000_000n });
assert.equal(deployed.execResult.exceptionError, undefined, "deployment failed");
const contract = deployed.createdAddress!;

async function call(from: typeof OWNER, fn: string, args: unknown[]) {
  const res = await evm.runCall({ caller: from, origin: from, to: contract, data: getBytes(iface.encodeFunctionData(fn, args)), gasLimit: 1_000_000n });
  const ret = hexlify(res.execResult.returnValue);
  if (res.execResult.exceptionError) {
    const err = ret === "0x" ? null : iface.parseError(ret);
    return { ok: false as const, error: err?.name ?? "revert", logs: [] };
  }
  return { ok: true as const, value: iface.decodeFunctionResult(fn, ret), logs: res.execResult.logs ?? [] };
}

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  await fn();
  passed++;
  process.stdout.write(`ok - ${name}\n`);
}

const H1 = keccak256(toUtf8Bytes("result-1"));
const H2 = keccak256(toUtf8Bytes("result-2"));

await test("owner is the deployer", async () => {
  const r = await call(OWNER, "owner", []);
  assert.ok(r.ok);
  assert.equal(String(r.value[0]).toLowerCase(), OWNER.toString());
});

await test("non-owner cannot record", async () => {
  const r = await call(OTHER, "recordTournament", [1n, H1, 7n, 4, 6, 1_700_000_000n]);
  assert.deepEqual([r.ok, r.ok ? null : r.error], [false, "NotOwner"]);
});

await test("empty hash or zero players is refused", async () => {
  const a = await call(OWNER, "recordTournament", [1n, "0x" + "00".repeat(32), 7n, 4, 6, 1n]);
  const b = await call(OWNER, "recordTournament", [1n, H1, 7n, 0, 6, 1n]);
  assert.equal(a.ok ? null : a.error, "InvalidRecord");
  assert.equal(b.ok ? null : b.error, "InvalidRecord");
});

await test("unknown id: isRecorded false, getTournament reverts", async () => {
  const a = await call(OWNER, "isRecorded", [1n]);
  assert.ok(a.ok && a.value[0] === false);
  const b = await call(OWNER, "getTournament", [1n]);
  assert.equal(b.ok ? null : b.error, "NotRecorded");
});

await test("owner records; event emitted; getters return the record", async () => {
  const r = await call(OWNER, "recordTournament", [1n, H1, 7n, 4, 6, 1_700_000_000n]);
  assert.ok(r.ok, "record reverted");
  assert.equal(r.logs.length, 1);
  const [, topics, data] = r.logs[0];
  const ev = iface.parseLog({ topics: topics.map((t) => hexlify(t)), data: hexlify(data) });
  assert.equal(ev?.name, "TournamentRecorded");
  assert.equal(ev?.args.id, 1n);
  assert.equal(ev?.args.resultHash, H1);
  const g = await call(OTHER, "getTournament", [1n]);
  assert.ok(g.ok);
  const rec = g.value[0];
  assert.equal(rec.resultHash, H1);
  assert.equal(rec.winnerId, 7n);
  assert.equal(rec.playerCount, 4n);
  assert.equal(rec.matchCount, 6n);
  assert.equal(rec.endedAt, 1_700_000_000n);
  const v1 = await call(OTHER, "verify", [1n, H1]);
  const v2 = await call(OTHER, "verify", [1n, H2]);
  assert.ok(v1.ok && v1.value[0] === true);
  assert.ok(v2.ok && v2.value[0] === false);
});

await test("a second record for the same id reverts (immutable)", async () => {
  const r = await call(OWNER, "recordTournament", [1n, H2, 8n, 2, 1, 1n]);
  assert.equal(r.ok ? null : r.error, "AlreadyRecorded");
  const g = await call(OTHER, "getTournament", [1n]);
  assert.ok(g.ok && g.value[0].resultHash === H1, "record changed");
});

await test("enumeration", async () => {
  const big = (1n << 255n) + 5n; // derived keys are full 256-bit
  assert.ok((await call(OWNER, "recordTournament", [big, H2, 0n, 2, 1, 1n])).ok);
  const n = await call(OTHER, "tournamentCount", []);
  assert.ok(n.ok && n.value[0] === 2n);
  const i1 = await call(OTHER, "tournamentIdAt", [1n]);
  assert.ok(i1.ok && i1.value[0] === big);
});

await test("ownership transfer moves the write permission", async () => {
  assert.equal((await call(OTHER, "transferOwnership", [OTHER.toString()])).ok, false);
  assert.ok((await call(OWNER, "transferOwnership", [OTHER.toString()])).ok);
  const a = await call(OWNER, "recordTournament", [3n, H1, 1n, 2, 1, 1n]);
  assert.equal(a.ok ? null : a.error, "NotOwner");
  assert.ok((await call(OTHER, "recordTournament", [3n, H1, 1n, 2, 1, 1n])).ok);
});

await test("canonical hash: order-independent, name-free, score-sensitive", async () => {
  const at = (s: string) => new Date(`2026-11-18T10:${s}:00.000Z`);
  const row: TournamentHashRow = {
    id: 9,
    externalId: "6f1d2c1e-2b6a-4d0c-9d38-0f7d1d3b9a11",
    winnerId: 2,
    start_at: at("00"),
    end_at: at("30"),
    players: [{ userId: 3 }, { userId: 1 }, { userId: 2 }],
    matches: [
      { id: 11, player1Id: 2, player2Id: 3, player1Score: 5, player2Score: 1, winnerId: 2, played_at: at("10"), end_at: at("15") },
      { id: 10, player1Id: 1, player2Id: 2, player1Score: 3, player2Score: 5, winnerId: 2, played_at: at("01"), end_at: at("05") },
    ],
  };
  const shuffled = { ...row, players: [...row.players].reverse(), matches: [...row.matches].reverse() };
  assert.equal(resultHash(row), resultHash(shuffled));
  assert.ok(!/displayName|alice|@/i.test(canonicalResult(row)));
  const tampered = { ...row, matches: row.matches.map((m, i) => (i === 0 ? { ...m, player2Score: 2 } : m)) };
  assert.notEqual(resultHash(row), resultHash(tampered));
  assert.equal(chainKey(row), chainKey({ id: 999, externalId: row.externalId }), "key must not depend on the db id");
  assert.deepEqual(recordFields(row), { winnerId: 2n, playerCount: 3, matchCount: 2, endedAt: BigInt(Date.parse("2026-11-18T10:30:00Z") / 1000) });
  // the derived key and hash are accepted by the contract
  const r = await call(OTHER, "recordTournament", [chainKey(row), resultHash(row), 2n, 3, 2, recordFields(row).endedAt]);
  assert.ok(r.ok);
});

process.stdout.write(`\n${passed} passed\n`);
