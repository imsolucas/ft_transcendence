import crypto from "node:crypto";
import { PartyEngine, default_config } from "shared/index.ts";
import type { GameConfig, PartyEndMessage, PartyPlayer, PartyQueueMessage, PartyStanding, PartyStartMessage, PartyStateMessage, Player, PlayerInputs, PlayerReadyMessage } from "shared/index.ts";
import type { RoomManager } from "../game/roomManager.ts";
import type { Room } from "../types/room.types.ts";
import type { MessageBroadcaster } from "./Broadcaster.ts";
import { gameEnded, gameStarted } from "../presence.ts";
import { reportPartyResult } from "../utils/reportResults.ts";

export const PARTY_MIN = 3;
export const PARTY_MAX = 4;
/** with 3 (but not 4) players queued, the party starts after this wait */
export const PARTY_QUEUE_WAIT_MS = 15_000;

/** The server's config for a party room; nothing physical comes from the client. */
export function partyConfig(isPrivate: boolean): GameConfig {
    return { ...structuredClone(default_config.standardGame), mode: "party", isPrivate, numPlayers: PARTY_MAX };
}

/**
 * Party mode (3–4 players): matchmaking queue, ready check, the authoritative PartyEngine
 * per room, eliminations (leave / forfeit / reconnect timeout) and the result report.
 * Lobby messages (playerJoined, playerReady, playerLeft) are the 1v1 ones.
 */
export default class PartyService {
    private queue: { player: Player; since: number }[] = [];
    private queueTimer: ReturnType<typeof setTimeout> | null = null;
    private startsAt: number | null = null;

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
        return this.queue.some((q) => q.player.id === playerId);
    }

    /** false when the player is already seated in a room */
    joinQueue(player: Player): boolean {
        if (player.roomId) return false;
        if (!this.isQueued(player.id)) this.queue.push({ player, since: Date.now() });
        this.evaluate();
        return true;
    }

    /** Idempotent. */
    leaveQueue(player: Player): boolean {
        const before = this.queue.length;
        this.queue = this.queue.filter((q) => q.player.id !== player.id);
        if (this.queue.length === before) return false;
        this.evaluate();
        return true;
    }

    /** 4 queued: start now · 3 queued: start after PARTY_QUEUE_WAIT_MS · fewer: wait. */
    private evaluate(): void {
        // drop anyone who went away or got seated elsewhere since queueing
        this.queue = this.queue.filter((q) => {
            const live = this.roomManager.getPlayer(q.player.id);
            return live === q.player && !q.player.roomId && q.player.socket.readyState === 1;
        });
        while (this.queue.length >= PARTY_MAX) this.form(this.queue.splice(0, PARTY_MAX).map((q) => q.player));

        if (this.queue.length >= PARTY_MIN) {
            if (!this.queueTimer) {
                this.startsAt = Date.now() + PARTY_QUEUE_WAIT_MS;
                this.queueTimer = setTimeout(() => {
                    this.queueTimer = null;
                    this.startsAt = null;
                    try {
                        // re-check who is still there; 3+ → a party of everyone waiting (max 4)
                        this.queue = this.queue.filter((q) => this.roomManager.getPlayer(q.player.id) === q.player && !q.player.roomId && q.player.socket.readyState === 1);
                        if (this.queue.length >= PARTY_MIN) this.form(this.queue.splice(0, PARTY_MAX).map((q) => q.player));
                        this.evaluate();
                    } catch {
                        // a failed start must not take the process down; the queue is re-evaluated on the next join
                    }
                }, PARTY_QUEUE_WAIT_MS);
            }
        } else if (this.queueTimer) {
            clearTimeout(this.queueTimer);
            this.queueTimer = null;
            this.startsAt = null;
        }
        this.announceQueue();
    }

    private announceQueue(): void {
        const msg: PartyQueueMessage = {
            type: "partyQueue",
            data: { waiting: this.queue.length, needed: PARTY_MIN, startsAt: this.startsAt },
            timestamp: Date.now(),
        };
        const json = JSON.stringify(msg);
        for (const q of this.queue) q.player.socket.send(json);
    }

    private form(players: Player[]): void {
        const room = this.roomManager.createRoom(partyConfig(false));
        const seated: Player[] = [];
        for (const p of players) {
            if (this.roomManager.addPlayerToRoom(room.id, p.id)) seated.push(p);
        }
        if (seated.length < PARTY_MIN) {
            // could not seat enough (raced with something else): put them back in the queue
            for (const p of seated) this.roomManager.removePlayerFromRoom(room.id, p.id);
            this.roomManager.removeRoom(room.id);
            for (const p of seated) if (!this.isQueued(p.id)) this.queue.unshift({ player: p, since: Date.now() });
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
        if (players.length >= PARTY_MIN && players.every((p) => p.isReady)) this.start(room, players);
    }

    /** Someone left the lobby: the ones still there may all be ready now. */
    recheckReady(room: Room): void {
        if (room.mode !== "party" || room.status === "playing" || room.status === "finished") return;
        const players = this.roomManager.getPlayersInRoom(room.id);
        if (players.length >= PARTY_MIN && players.every((p) => p.isReady)) this.start(room, players);
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
        room.party = {
            key: crypto.randomUUID(),
            engine: new PartyEngine(seats.length, crypto.randomInt(2 ** 31)),
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
        return seat >= 0 && room.status === "playing" && room.party?.engine.getState().paddles[seat]?.alive === true;
    }

    /** Knock a player out (forfeit, left the room, reconnect timeout): their side becomes a wall. */
    eliminate(room: Room, playerId: string): void {
        if (!room.party || room.status !== "playing") return;
        const seat = this.seatOf(room, playerId);
        if (seat < 0) return;
        room.party.engine.eliminate(seat);
        // presence: they are not playing any more (they may queue for something else now)
        gameEnded([playerId]);
        // nobody left to tick for: finish now (e.g. the second-to-last player left)
        if (room.party.engine.over) this.finish(room);
    }

    /** One simulation tick (TickSystem, 60 Hz): broadcast the state, finish when one is left. */
    tick(room: Room, dt: number): void {
        if (!room.party || room.status !== "playing") return;
        room.party.engine.tick(dt);
        const msg: PartyStateMessage = { type: "partyState", data: { state: room.party.engine.getState() }, timestamp: Date.now() };
        this.broadcaster.broadcastToRoom(room.id, msg);
        if (room.party.engine.over) this.finish(room);
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

        reportPartyResult({
            matchId: party.key,
            winnerId: winner ? parseInt(winner.id) : null,
            played_at: new Date(party.startedAt).toISOString(),
            end_at: new Date().toISOString(),
            players: standings.map((s) => ({ userId: parseInt(s.id), displayName: s.name, placement: s.place, livesLeft: s.lives })),
        });
    }
}
