// Records finished tournaments on an EVM chain (Avalanche Fuji, or anvil locally) and
// verifies them. Optional: everything here is a no-op when config.chain is null.
//
// Idempotency: the contract refuses a second record for the same key, and every attempt first
// reads the chain, so a retry after a lost receipt or a crash adopts the existing record
// (when its hash equals ours) instead of sending another transaction.
// Never blocks the tournament write: callers fire and forget, and a periodic sweep picks up
// whatever failed (chain down at the time, users restarted mid-way, anvil reset).
import type { FastifyBaseLogger } from "fastify";
import { Contract, ContractFactory, FetchRequest, JsonRpcProvider, Network, NonceManager, Wallet, getAddress } from "ethers";
import { config } from "../config.ts";
import { prisma } from "../db/client.ts";
import { TOURNAMENT_SCORES_ABI, TOURNAMENT_SCORES_BYTECODE } from "./artifact.ts";
import { TOURNAMENT_HASH_SELECT, chainKey, recordFields, resultHash } from "./canonical.ts";
import type { ChainVerification } from "../../../shared/types/api.types.ts";

const RPC_TIMEOUT_MS = 10_000;
const RECEIPT_TIMEOUT_MS = 120_000;
const RETRY_DELAYS_MS = [2_000, 10_000, 30_000];
const SWEEP_EVERY_MS = 2 * 60_000;
const SWEEP_BATCH = 20;
const VERIFY_CACHE_MS = 15_000;

// Publicly known anvil/hardhat dev keys: anyone can sign with them, so they are only allowed
// on a local dev chain (otherwise anyone could write "official" tournament records).
const PUBLIC_DEV_KEYS = new Set([
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
]);
// anvil/hardhat default, and the local Avalanche-style id used in compose
const LOCAL_CHAIN_IDS = new Set([31337, 1337, 43112]);

type Base = { provider: JsonRpcProvider; wallet: Wallet; signer: NonceManager; chainId: number };
type Conn = Base & { address: string; contract: Contract };
type OnChainRecord = { resultHash: string; blockNumber: number; recordedAt: Date };

class ChainRefused extends Error {}

let base: Base | null = null;
let conn: Conn | null = null;

export function chainEnabled(): boolean {
  return config.chain !== null;
}

export function explorerTx(txHash: string | null): string | null {
  return config.chain?.explorerUrl && txHash ? `${config.chain.explorerUrl}/tx/${txHash}` : null;
}

/** eth_chainId with a plain fetch, so ethers never runs its console-logging network detection. */
async function rpcChainId(url: string): Promise<number> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`rpc status ${res.status}`);
  const body = (await res.json()) as { result?: string };
  const id = Number(body.result);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("rpc returned no chain id");
  return id;
}

async function getBase(): Promise<Base> {
  if (base) return base;
  const c = config.chain!;
  const chainId = await rpcChainId(c.rpcUrl);
  if (c.chainId !== null && c.chainId !== chainId) {
    throw new ChainRefused(`CHAIN_ID is ${c.chainId} but the RPC serves chain ${chainId}`);
  }
  if (!LOCAL_CHAIN_IDS.has(chainId) && PUBLIC_DEV_KEYS.has(c.privateKey.toLowerCase())) {
    throw new ChainRefused(`refusing a public anvil dev key on chain ${chainId}; use your own funded test key`);
  }
  const req = new FetchRequest(c.rpcUrl);
  req.timeout = RPC_TIMEOUT_MS;
  const network = Network.from(chainId);
  const provider = new JsonRpcProvider(req, network, { staticNetwork: network, batchMaxCount: 1 });
  const wallet = new Wallet(c.privateKey, provider);
  // tracks the nonce locally: re-reading it over RPC right after a send can return a stale value
  base = { provider, wallet, signer: new NonceManager(wallet), chainId };
  return base;
}

async function hasCode(b: Base, address: string): Promise<boolean> {
  return (await b.provider.getCode(address)) !== "0x";
}

function attach(b: Base, address: string): Conn {
  return { ...b, address, contract: new Contract(address, TOURNAMENT_SCORES_ABI, b.signer) };
}

/**
 * The contract to use: CHAIN_CONTRACT_ADDRESS, else the newest contract this service deployed
 * on this chain that still has code (a restarted anvil loses its state), else, when
 * `allowDeploy`, a fresh deployment (stored in ChainDeployments). null = nothing deployed yet.
 */
async function getConn(allowDeploy: boolean, log: FastifyBaseLogger): Promise<Conn | null> {
  if (conn) return conn;
  const b = await getBase();
  const owner = b.wallet.address;
  // checksummed, so chainContract comparisons don't depend on how the env was typed
  const configured = config.chain!.contractAddress ? getAddress(config.chain!.contractAddress) : null;
  if (configured) {
    if (!(await hasCode(b, configured))) throw new ChainRefused(`no contract at CHAIN_CONTRACT_ADDRESS on chain ${b.chainId}`);
    const c = attach(b, configured);
    const onChainOwner = String(await c.contract.getFunction("owner")());
    if (onChainOwner.toLowerCase() !== owner.toLowerCase()) {
      log.warn({ contract: configured }, "[chain] CHAIN_PRIVATE_KEY is not the contract owner: records will be refused");
    }
    conn = c;
    return conn;
  }
  const deployments = await prisma.chainDeployment.findMany({
    where: { chainId: b.chainId, owner },
    orderBy: { id: "desc" },
    take: 5,
    select: { address: true },
  });
  for (const d of deployments) {
    if (await hasCode(b, d.address)) {
      conn = attach(b, d.address);
      return conn;
    }
  }
  if (!allowDeploy) return null;

  const factory = new ContractFactory(TOURNAMENT_SCORES_ABI, TOURNAMENT_SCORES_BYTECODE, b.signer);
  const deployed = await factory.deploy();
  const tx = deployed.deploymentTransaction();
  const receipt = tx ? await tx.wait(1, RECEIPT_TIMEOUT_MS) : null;
  if (!tx || !receipt || receipt.status !== 1) throw new Error("contract deployment failed");
  const address = await deployed.getAddress();
  await prisma.chainDeployment.create({
    data: { chainId: b.chainId, address, owner, txHash: tx.hash, blockNumber: receipt.blockNumber },
  });
  log.info({ chainId: b.chainId, contract: address, txHash: tx.hash }, "[chain] TournamentScores deployed (set CHAIN_CONTRACT_ADDRESS to pin it)");
  // A reset dev chain hands the same deployer the same address again (nonce 0), but the new
  // contract is empty: records stored against that address are void, so the sweep redoes them.
  const voided = await prisma.tournament.updateMany({
    where: { chainContract: address },
    data: { chainContract: null, chainTxHash: null, chainBlock: null, chainResultHash: null, chainRecordedAt: null, chainError: null },
  });
  if (voided.count) log.info({ tournaments: voided.count }, "[chain] fresh contract at a reused address; re-recording");
  conn = attach(b, address);
  return conn;
}

/** Forget the cached contract (and provider on a hard failure), so the next call re-checks. */
function resetConn(hard = false) {
  conn = null;
  base?.signer.reset(); // resync the local nonce from the chain on the next send
  // dropped through the queue, so an in-flight send/wait keeps its provider until it ends
  if (hard) {
    void serial(async () => {
      base?.provider.destroy();
      base = null;
    });
  }
}

async function readRecord(c: Conn, key: bigint): Promise<OnChainRecord | null> {
  const recorded = Boolean(await c.contract.getFunction("isRecorded")(key));
  if (!recorded) return null;
  const r = await c.contract.getFunction("getTournament")(key);
  return {
    resultHash: String(r.resultHash).toLowerCase(),
    blockNumber: Number(r.blockNumber),
    recordedAt: new Date(Number(r.recordedAt) * 1000),
  };
}

/** The transaction that recorded `key` (one-block log query: public RPCs cap log ranges). */
async function findTxHash(c: Conn, key: bigint, block: number): Promise<string | null> {
  const events = await c.contract.queryFilter(c.contract.filters.TournamentRecorded(key), block, block);
  return events[0]?.transactionHash ?? null;
}

function revertName(c: Conn, err: unknown): string | null {
  const e = err as { revert?: { name?: string }; data?: string; info?: { error?: { data?: string } } };
  if (e?.revert?.name) return e.revert.name;
  const data = e?.data ?? e?.info?.error?.data;
  if (typeof data !== "string") return null;
  try {
    return c.contract.interface.parseError(data)?.name ?? null;
  } catch {
    return null;
  }
}

// One signer, one queue: sends never race on the nonce.
let queueTail: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueTail.then(fn, fn);
  queueTail = run.catch(() => undefined);
  return run;
}

type Outcome = "recorded" | "adopted" | "conflict" | "done" | "skipped";

async function recordOnce(tournamentId: number, log: FastifyBaseLogger): Promise<Outcome> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { ...TOURNAMENT_HASH_SELECT, chainContract: true, chainTxHash: true, chainError: true },
  });
  if (!t || !t.end_at) return "skipped";
  const fields = recordFields(t);
  if (fields.playerCount === 0) return "skipped";
  const c = await getConn(true, log);
  if (!c) return "skipped";
  if (t.chainContract === c.address && (t.chainTxHash || t.chainError === "conflict")) return "done";

  const key = chainKey(t);
  const hash = resultHash(t);
  let existing = await readRecord(c, key);
  if (!existing) {
    try {
      const tx = await c.contract.getFunction("recordTournament")(key, hash, fields.winnerId, fields.playerCount, fields.matchCount, fields.endedAt);
      const receipt = await tx.wait(1, RECEIPT_TIMEOUT_MS);
      if (!receipt || receipt.status !== 1) throw new Error("record transaction failed");
      await prisma.tournament.update({
        where: { id: t.id },
        data: { chainContract: c.address, chainTxHash: tx.hash, chainBlock: receipt.blockNumber, chainResultHash: hash, chainRecordedAt: new Date(), chainError: null },
      });
      log.info({ tournamentId: t.id, txHash: tx.hash, block: receipt.blockNumber }, "[chain] tournament recorded");
      return "recorded";
    } catch (err) {
      // a concurrent or earlier attempt got there first (lost receipt, restart): adopt it below
      if (revertName(c, err) !== "AlreadyRecorded") throw err;
      existing = await readRecord(c, key);
      if (!existing) throw err;
    }
  }

  if (existing.resultHash !== hash.toLowerCase()) {
    await prisma.tournament.update({
      where: { id: t.id },
      data: { chainContract: c.address, chainTxHash: null, chainBlock: existing.blockNumber, chainResultHash: hash, chainError: "conflict" },
    });
    log.error({ tournamentId: t.id, block: existing.blockNumber }, "[chain] a different result is already on chain for this tournament");
    return "conflict";
  }
  const txHash = await findTxHash(c, key, existing.blockNumber);
  await prisma.tournament.update({
    where: { id: t.id },
    data: { chainContract: c.address, chainTxHash: txHash, chainBlock: existing.blockNumber, chainResultHash: hash, chainRecordedAt: existing.recordedAt, chainError: null },
  });
  log.info({ tournamentId: t.id, txHash }, "[chain] tournament already on chain; adopted the record");
  return "adopted";
}

function errSummary(err: unknown) {
  // ethers errors carry the request (never the key); keep the log to code + short message
  const e = err as { code?: string; shortMessage?: string; message?: string; name?: string };
  return { code: e?.code, message: (e?.shortMessage ?? e?.message ?? e?.name ?? "error").slice(0, 200) };
}

const inFlight = new Set<number>();

async function recordWithRetry(tournamentId: number, log: FastifyBaseLogger, delays: number[]): Promise<void> {
  if (inFlight.has(tournamentId)) return;
  inFlight.add(tournamentId);
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        await serial(() => recordOnce(tournamentId, log));
        return;
      } catch (err) {
        const refused = err instanceof ChainRefused;
        resetConn(!refused);
        const delay = delays[attempt];
        if (refused || delay === undefined) {
          log.warn({ tournamentId, attempts: attempt + 1, err: errSummary(err) }, "[chain] recording postponed; the periodic sweep will retry");
          return;
        }
        await new Promise((r) => setTimeout(r, delay).unref());
      }
    }
  } finally {
    inFlight.delete(tournamentId);
    // the stored state may have changed: the next verification reads it fresh
    verifyCache.delete(tournamentId);
  }
}

/** Fire and forget after a tournament is stored. Never throws, never blocks the response. */
export function recordTournamentOnChainLater(tournamentId: number, log: FastifyBaseLogger): void {
  if (!config.chain) return;
  void recordWithRetry(tournamentId, log, RETRY_DELAYS_MS).catch((err) => log.error({ err: errSummary(err) }, "[chain] record failed"));
}

let chainUp: boolean | null = null;

/** Finished tournaments not yet recorded on the current contract, oldest first. */
async function sweep(log: FastifyBaseLogger): Promise<void> {
  let c: Conn | null;
  try {
    // a restarted anvil keeps its chain id but loses the contract: re-resolve if the code is gone
    // inside the queue, so a hard reset below never destroys the provider under a pending write
    c = await serial(async () => {
      if (conn && !(await hasCode(conn, conn.address))) resetConn();
      return getConn(true, log);
    });
    if (chainUp !== true) log.info({ chainId: c?.chainId, contract: c?.address }, "[chain] connected");
    chainUp = true;
  } catch (err) {
    resetConn(!(err instanceof ChainRefused));
    if (chainUp !== false) log.warn({ err: errSummary(err) }, "[chain] unreachable or misconfigured; tournaments stay pending");
    chainUp = false;
    return;
  }
  if (!c) return;
  const pending = await prisma.tournament.findMany({
    where: { end_at: { not: null }, OR: [{ chainContract: null }, { chainContract: { not: c.address } }] },
    orderBy: { id: "asc" },
    take: SWEEP_BATCH,
    select: { id: true },
  });
  for (const p of pending) await recordWithRetry(p.id, log, []);
}

/** Startup + periodic retry of tournaments missing a transaction. */
export function startChainSweeper(log: FastifyBaseLogger): void {
  if (!config.chain) {
    log.info("[chain] tournament recording off (CHAIN_RPC_URL / CHAIN_PRIVATE_KEY not set)");
    return;
  }
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    sweep(log)
      .catch((err) => log.error({ err: errSummary(err) }, "[chain] sweep failed"))
      .finally(() => {
        running = false;
      });
  };
  setTimeout(tick, 5_000).unref();
  setInterval(tick, SWEEP_EVERY_MS).unref();
}

const verifyCache = new Map<number, { at: number; value: ChainVerification }>();

/**
 * Recompute the canonical hash from the database and compare it with the on-chain record.
 * null = no such tournament. RPC trouble is "unavailable", never "mismatch".
 */
export async function verifyTournament(tournamentId: number, log: FastifyBaseLogger): Promise<ChainVerification | null> {
  const cached = verifyCache.get(tournamentId);
  if (cached && Date.now() - cached.at < VERIFY_CACHE_MS) return cached.value;

  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { ...TOURNAMENT_HASH_SELECT, chainContract: true, chainTxHash: true, chainBlock: true },
  });
  if (!t) return null;
  const hash = resultHash(t);
  const out: ChainVerification = {
    status: "disabled",
    txHash: t.chainTxHash,
    blockNumber: t.chainBlock,
    contract: t.chainContract,
    chainId: null,
    resultHash: hash,
    onChainHash: null,
    explorerUrl: explorerTx(t.chainTxHash),
  };
  if (!config.chain) return out;
  if (!t.end_at) return { ...out, status: "pending" };

  let value: ChainVerification;
  try {
    const c = await getConn(false, log);
    if (!c) {
      value = { ...out, status: "pending" };
    } else {
      const rec = await readRecord(c, chainKey(t));
      const sameContract = t.chainContract === c.address;
      const txHash = sameContract ? t.chainTxHash : null;
      value = rec
        ? {
            ...out,
            status: rec.resultHash === hash.toLowerCase() ? "verified" : "mismatch",
            chainId: c.chainId,
            contract: c.address,
            blockNumber: rec.blockNumber,
            onChainHash: rec.resultHash,
            txHash,
            explorerUrl: explorerTx(txHash),
          }
        : { ...out, status: "pending", chainId: c.chainId, contract: c.address, txHash: null, blockNumber: null, explorerUrl: null };
    }
  } catch (err) {
    // soft reset only: the provider may be serving an in-flight write (the write path recreates it)
    resetConn(false);
    log.warn({ tournamentId, err: errSummary(err) }, "[chain] verification read failed");
    return { ...out, status: "unavailable" };
  }
  if (verifyCache.size > 500) verifyCache.clear();
  verifyCache.set(tournamentId, { at: Date.now(), value });
  return value;
}
