import crypto from "node:crypto";
import { CyclesEngine, PartyEngine, default_config } from "shared/index.ts";
import type { CyclesTickMessage, GameConfig, PartyEndMessage, PartyGame, PartyPlayer, PartyQueueMessage, PartyStanding, PartyStartMessage, PartyStateMessage, Player, PlayerInputs, PlayerReadyMessage } from "shared/index.ts";
import type { RoomManager } from "../game/roomManager.ts";
import type { Room } from "../types/room.types.ts";
import type { MessageBroadcaster } from "./Broadcaster.ts";
import { gameEnded, gameStarted } from "../presence.ts";
import { reportPartyResult } from "../utils/reportResults.ts";

export const PARTY_MIN = 3;
export const PARTY_MAX = 4;
/** fewest players a party game starts with: Pong needs 3 sides, Light Cycles 2 riders */
export const partyMin = (game: PartyGame | undefined) => (game === "cycles" ? 2 : PARTY_MIN);
const GAMES: PartyGame[] = ["pong", "cycles"];

interface Queue {
    list: { player: Player; since: number }[];
    timer: ReturnType<typeof setTimeout> | null;
    startsAt: number | null;
}
/** with 3 (but not 4) players queued, the party starts after this wait */
export const PARTY_QUEUE_WAIT_MS = 15_000;

/** The server's config for a party room; nothing physical comes from the client. */
export function partyConfig(isPrivate: boolean, game: PartyGame = "pong"): GameConfig {
    return { ...structuredClone(default_config.standardGame), mode: "party", isPrivate, numPlayers: PARTY_MAX, partyGame: game };
}

/**
 * Party mode (3–4 players): matchmaking queue, ready check, the authoritative PartyEngine
 * per room, eliminations (leave / forfeit / reconnect timeout) and the result report.
 * Lobby messages (playerJoined, playerReady, playerLeft) are the 1v1 ones.
 */
export default class PartyService {
    /** one matchmaking queue per party game */
    private queues: Record<PartyGame, Queue> = { pong: { list: [], timer: null, startsAt: null }, cycles: { list: [], timer: null, startsAt: null } };

    constructor(
        private roomManager: RoomManager,
        private broadcaster: MessageBroadcaster,
        /** a matchmade room was just formed: tell its players and arm the ready check */
        private onRoomFormed: (room: Room, players: Player[]) => void,
        /** the ready check passed (clears the ready deadline) */
        private onStarted: (room: Room) => void
    ) {}

    // ---------------------------------------------------------------- queue

    isQueued(playerId: string): boolean {
        return GAMES.some((g) => this.queues[g].list.some((q) => q.player.id === playerId));
    }

    /** false when the player is already seated in a room */
    joinQueue(player: Player, game: PartyGame = "pong"): boolean {
        if (player.roomId) return false;
        // one search at a time: switching game leaves the other queue
        for (const g of GAMES) if (g !== game) this.dropFrom(g, player.id);
        const q = this.queues[game];
        if (!q.list.some((e) => e.player.id === player.id)) q.list.push({ player, since: Date.now() });
        this.evaluate(game);
        return true;
    }

    /** Idempotent. */
    leaveQueue(player: Player): boolean {
        let left = false;
        for (const g of GAMES) if (this.dropFrom(g, player.id)) left = true;
        return left;
    }

    private dropFrom(game: PartyGame, playerId: string): boolean {
        const q = this.queues[game];
        const before = q.list.length;
        q.list = q.list.filter((e) => e.player.id !== playerId);
        if (q.list.length === before) return false;
        this.evaluate(game);
        return true;
    }

    private stillWaiting(e: { player: Player }): boolean {
        return this.roomManager.getPlayer(e.player.id) === e.player && !e.player.roomId && e.player.socket.readyState === 1;
    }

    /** 4 queued: start now · enough (3 for Pong, 2 for Light Cycles): start after PARTY_QUEUE_WAIT_MS · fewer: wait. */
    private evaluate(game: PartyGame): void {
        const q = this.queues[game];
        const min = partyMin(game);
        // drop anyone who went away or got seated elsewhere since queueing
        q.list = q.list.filter((e) => this.stillWaiting(e));
        while (q.list.length >= PARTY_MAX) this.form(q.list.splice(0, PARTY_MAX).map((e) => e.player), game);

        if (q.list.length >= min) {
            if (!q.timer) {
                q.startsAt = Date.now() + PARTY_QUEUE_WAIT_MS;
                q.timer = setTimeout(() => {
                    q.timer = null;
                    q.startsAt = null;
                    try {
                        // re-check who is still there; enough → a party of everyone waiting (max 4)
                        q.list = q.list.filter((e) => this.stillWaiting(e));
                        if (q.list.length >= min) this.form(q.list.splice(0, PARTY_MAX).map((e) => e.player), game);
                        this.evaluate(game);
                    } catch {
                        // a failed start must not take the process down; the queue is re-evaluated on the next join
                    }
                }, PARTY_QUEUE_WAIT_MS);
            }
        } else if (q.timer) {
            clearTimeout(q.timer);
            q.timer = null;
            q.startsAt = null;
        }
        this.announceQueue(game);
    }

    private announceQueue(game: PartyGame): void {
        const q = this.queues[game];
        const msg: PartyQueueMessage = {
            type: "partyQueue",
            data: { waiting: q.list.length, needed: partyMin(game), startsAt: q.startsAt, game },
            timestamp: Date.now(),
        };
        const json = JSON.stringify(msg);
        for (const e of q.list) e.player.socket.send(json);
    }

    private form(players: Player[], game: PartyGame): void {
        const room = this.roomManager.createRoom(partyConfig(false, game));
        const seated: Player[] = [];
        for (const p of players) {
            if (this.roomManager.addPlayerToRoom(room.id, p.id)) seated.push(p);
        }
        if (seated.length < partyMin(game)) {
            // could not seat enough (raced with something else): put them back in the queue
            for (const p of seated) this.roomManager.removePlayerFromRoom(room.id, p.id);
            this.roomManager.removeRoom(room.id);
            for (const p of seated) if (!this.isQueued(p.id)) this.queues[game].list.unshift({ player: p, since: Date.now() });
            return;
        }
        this.onRoomFormed(room, seated);
    }

    // ---------------------------------------------------------------- ready check and start

    setReady(room: Room, player: Player, ready: boolean): void {
        if (room.status === "playing" || room.status === "finished") return;
        player.isReady = ready;
        const msg: PlayerReadyMessage = {
            type: "playerReady",
            data: { playerName: player.name, playerId: player.id, ready },
            timestamp: Date.now(),
        };
        this.broadcaster.broadcastToRoom(room.id, msg);
        const players = this.roomManager.getPlayersInRoom(room.id);
        if (players.length >= partyMin(room.config.partyGame) && players.every((p) => p.isReady)) this.start(room, players);
    }

    /** Someone left the lobby: the ones still there may all be ready now. */
    recheckReady(room: Room): void {
        if (room.mode !== "party" || room.status === "playing" || room.status === "finished") return;
        const players = this.roomManager.getPlayersInRoom(room.id);
        if (players.length >= partyMin(room.config.partyGame) && players.every((p) => p.isReady)) this.start(room, players);
    }

    private start(room: Room, players: Player[]): void {
        // seats are drawn at random on the server (fair: nobody picks the wall side of a 3-player court)
        const order = [...players];
        for (let i = order.length - 1; i > 0; i--) {
            const j = crypto.randomInt(i + 1);
            [order[i], order[j]] = [order[j]!, order[i]!];
        }
        const seats: PartyPlayer[] = order.map((p, seat) => {
            p.position = seat + 1;
            return { id: p.id, name: p.name, ...(p.picture ? { picture: p.picture } : {}), ...(p.look ? { look: p.look } : {}), seat };
        });
        const game: PartyGame = room.config.partyGame === "cycles" ? "cycles" : "pong";
        room.party = {
            key: crypto.randomUUID(),
            game,
            engine: game === "cycles" ? new CyclesEngine(seats.length) : new PartyEngine(seats.length, crypto.randomInt(2 ** 31)),
            seats,
            startedAt: Date.now(),
            finished: false,
        };
        room.status = "playing";
        room.createdAt = Date.now();
        this.onStarted(room);
        const msg: PartyStartMessage = {
            type: "partyStart",
            data: { roomId: room.id, players: seats, state: room.party.engine.getState() },
            timestamp: Date.now(),
        };
        this.broadcaster.broadcastToRoom(room.id, msg);
        gameStarted(room.playerIds);
    }

    /** The party's start message, for a player who rejoins mid-game. */
    startMessage(room: Room): PartyStartMessage | null {
        if (!room.party) return null;
        return { type: "partyStart", data: { roomId: room.id, players: room.party.seats, state: room.party.engine.getState() }, timestamp: Date.now() };
    }

    // ---------------------------------------------------------------- play

    seatOf(room: Room, playerId: string): number {
        return room.party?.seats.findIndex((s) => s.id === playerId) ?? -1;
    }

    /** Only the seat's own player drives it; left/right only (validated booleans). */
    input(room: Room, player: Player, inputs: Partial<PlayerInputs> | undefined): boolean {
        if (!room.party || room.status !== "playing") return false;
        const seat = this.seatOf(room, player.id);
        if (seat < 0) return false;
        room.party.engine.input(seat, { left: inputs?.left === true, right: inputs?.right === true });
        return true;
    }

    /** Is this player still in the running (holds a live seat)? */
    isAlive(room: Room, playerId: string): boolean {
        const seat = this.seatOf(room, playerId);
        return seat >= 0 && room.status === "playing" && room.party?.engine.isAlive(seat) === true;
    }

    /** Knock a player out (forfeit, left the room, reconnect timeout): their side becomes a wall. */
    eliminate(room: Room, playerId: string): void {
        if (!room.party || room.status !== "playing") return;
        const seat = this.seatOf(room, playerId);
        if (seat < 0) return;
        const engine = room.party.engine;
        if (engine instanceof CyclesEngine) {
            // the crash (trail gone) reaches everyone as a normal step
            const delta = engine.eliminate(seat);
            if (delta) this.broadcastCycles(room, delta);
        } else engine.eliminate(seat);
        // presence: they are not playing any more (they may queue for something else now)
        gameEnded([playerId]);
        // nobody left to tick for: finish now (e.g. the second-to-last player left)
        if (room.party.engine.over) this.finish(room);
    }

    /** One simulation tick (TickSystem, 60 Hz): broadcast the state, finish when one is left. */
    tick(room: Room, dt: number): void {
        if (!room.party || room.status !== "playing") return;
        const engine = room.party.engine;
        if (engine instanceof CyclesEngine) {
            // a step is ~10–18 per second: send each one, nothing in between
            for (const delta of engine.tick(dt)) this.broadcastCycles(room, delta);
        } else {
            engine.tick(dt);
            const msg: PartyStateMessage = { type: "partyState", data: { state: engine.getState() }, timestamp: Date.now() };
            this.broadcaster.broadcastToRoom(room.id, msg);
        }
        if (engine.over) this.finish(room);
    }

    private broadcastCycles(room: Room, delta: ReturnType<CyclesEngine["tick"]>[number]): void {
        const msg: CyclesTickMessage = { type: "cyclesTick", data: { delta }, timestamp: Date.now() };
        this.broadcaster.broadcastToRoom(room.id, msg);
    }

    private finish(room: Room): void {
        const party = room.party;
        if (!party || party.finished) return;
        party.finished = true;
        room.status = "finished";
        room.paused = false;
        const standings: PartyStanding[] = party.engine.standings().map((s) => {
            const p = party.seats[s.seat]!;
            return { id: p.id, name: p.name, seat: s.seat, place: s.place, lives: s.lives };
        });
        const winnerSeat = party.engine.winner;
        const winner = winnerSeat !== null ? party.seats[winnerSeat] : undefined;
        const end: PartyEndMessage = {
            type: "partyEnd",
            data: { winner: winner ? { id: winner.id, name: winner.name } : null, standings },
            timestamp: Date.now(),
        };
        this.broadcaster.broadcastToRoom(room.id, end);
        // everyone still in the room (leavers were ended when they left)
        gameEnded(room.playerIds);
        for (const p of this.roomManager.getPlayersInRoom(room.id)) p.isReady = false;

        // a Light Cycles race over within ~3 s (an instant forfeit, two friends farming wins) isn't recorded
        if (party.engine instanceof CyclesEngine && party.engine.steps < 30) return;
        reportPartyResult({
            matchId: party.key,
            game: party.game,
            winnerId: winner ? parseInt(winner.id) : null,
            played_at: new Date(party.startedAt).toISOString(),
            end_at: new Date().toISOString(),
            players: standings.map((s) => ({ userId: parseInt(s.id), displayName: s.name, placement: s.place, livesLeft: s.lives })),
        });
    }
}
