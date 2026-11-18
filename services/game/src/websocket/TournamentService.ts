import { randomInt, randomUUID } from "node:crypto";
import type { GameStartMessage, Player, TournamentEndMessage, TournamentRoundEndMessage, TournamentState, TournamentStateMessage } from "shared/index.ts";
import type { RoomManager } from "../game/roomManager.ts";
import type { Room, TournamentRuntime } from "../types/room.types.ts";
import type { MessageBroadcaster } from "./Broadcaster.ts";
import { createBracket, findMatch, MAX_BRACKET_PLAYERS, nextMatch, outcome, recordResult, withdraw } from "../tournament/bracket.ts";
import { gameEnded, gameStarted } from "../presence.ts";
import { reportTournamentResult } from "../utils/reportResults.ts";

export const MIN_TOURNAMENT_PLAYERS = 3;
/** the two players of a match must both press ready within this, or the absent one forfeits */
export const TOURNAMENT_READY_MS = 30_000;
/** pause after a result so everyone sees the bracket move */
export const BETWEEN_MATCHES_MS = 4_000;

/** Fisher–Yates with crypto randomness: seeding decides who meets whom. */
function shuffle<T>(items: T[]): T[] {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
}

/**
 * Single-elimination tournaments, one match at a time inside the tournament room.
 *
 * registration → (host starts with ≥ 3, or the room fills) → for each match in bracket order:
 * ready check → playing → between → … → finished. Everyone else in the room watches the
 * live match. Every transition goes through here and is guarded by the current match id, so
 * a late timer, a leave and a disconnect can't decide the same match twice. The bracket
 * state is broadcast to the room (and its watchers) after every change.
 */
export default class TournamentService {
    constructor(
        private roomManager: RoomManager,
        private broadcaster: MessageBroadcaster,
        /** creates the room's GameServer and sets it playing */
        private startGame: (room: Room) => void,
    ) {}

    // ------------------------------------------------------------ queries

    private alive(room: Room): boolean {
        return this.roomManager.getRoom(room.id) === room;
    }

    /** Registration is open (no runtime yet = the creator is about to join). */
    registrationOpen(room: Room): boolean {
        return room.mode === "tournament" && (!room.tournament || room.tournament.phase === "registration");
    }

    /** The two players of the match being readied or played. */
    currentPair(room: Room): [string, string] | null {
        const t = room.tournament;
        if (!t?.bracket || !t.currentMatchId) return null;
        const m = findMatch(t.bracket, t.currentMatchId);
        return m?.p1 && m.p2 ? [m.p1, m.p2] : null;
    }

    /** Bracket in progress and this player is still in it (not left): hold them on a disconnect. */
    holdsSlot(room: Room, playerId: string): boolean {
        const t = room.tournament;
        if (!t || t.phase === "registration" || t.phase === "finished") return false;
        return t.players.some((p) => p.id === playerId && !p.withdrawn);
    }

    isLivePlayer(room: Room, playerId: string): boolean {
        return room.tournament?.phase === "playing" && (this.currentPair(room)?.includes(playerId) ?? false);
    }

    nameOf(room: Room, playerId: string): string {
        return room.tournament?.players.find((p) => p.id === playerId)?.name ?? "?";
    }

    getState(room: Room): TournamentState | null {
        const t = room.tournament;
        if (!t) return null;
        return {
            roomId: room.id,
            phase: t.phase,
            size: t.size,
            hostId: t.hostId,
            players: t.players.map((p) => ({ ...p })),
            rounds: t.bracket ? t.bracket.rounds.map((r) => r.map((m) => ({ ...m, scores: m.scores ? [m.scores[0], m.scores[1]] : null }))) : [],
            currentMatchId: t.currentMatchId,
            readyIds: [...t.readyIds],
            readyDeadline: t.readyDeadline,
            championId: t.championId,
        };
    }

    private stateMessage(room: Room): TournamentStateMessage | null {
        const state = this.getState(room);
        return state ? { type: "tournamentState", data: { state }, timestamp: Date.now() } : null;
    }

    broadcastState(room: Room): void {
        const msg = this.stateMessage(room);
        if (msg) this.broadcaster.broadcastToRoom(room.id, msg);
    }

    sendState(room: Room, player: Player): void {
        const msg = this.stateMessage(room);
        if (msg) player.socket.send(JSON.stringify(msg));
    }

    private clearTimer(t: TournamentRuntime) {
        if (t.timer) clearTimeout(t.timer);
        t.timer = null;
    }

    // ------------------------------------------------------------ registration

    /** A player entered the room (the creator first: they become the host). */
    onJoined(room: Room, player: Player): void {
        if (room.mode !== "tournament") return;
        if (!room.tournament) {
            room.tournament = {
                key: randomUUID(),
                hostId: player.id,
                size: Math.min(MAX_BRACKET_PLAYERS, room.config.numPlayers ?? MAX_BRACKET_PLAYERS),
                players: [],
                bracket: null,
                phase: "registration",
                currentMatchId: null,
                readyIds: new Set(),
                readyDeadline: null,
                matchStartedAt: 0,
                startedAt: 0,
                records: [],
                championId: null,
                timer: null,
            };
        }
        const t = room.tournament;
        if (t.phase !== "registration") return;
        if (!t.players.some((p) => p.id === player.id)) {
            t.players.push({ id: player.id, name: player.name, ...(player.picture ? { picture: player.picture } : {}), withdrawn: false });
        }
        player.position = 0;
        if (room.playerIds.length >= t.size) this.start(room);
        else this.broadcastState(room);
    }

    /** Host only, ≥ 3 players. Returns false when refused. */
    requestStart(room: Room, player: Player): boolean {
        const t = room.tournament;
        if (!t || t.phase !== "registration" || t.hostId !== player.id) return false;
        if (room.playerIds.length < MIN_TOURNAMENT_PLAYERS) return false;
        this.start(room);
        return true;
    }

    private start(room: Room): void {
        const t = room.tournament!;
        // only who is in the room now; seeding is random (crypto)
        t.players = t.players.filter((p) => room.playerIds.includes(p.id));
        t.bracket = createBracket(shuffle(t.players.map((p) => p.id)));
        t.startedAt = Date.now();
        room.status = "full"; // closed: nobody else can join
        for (const p of this.roomManager.getPlayersInRoom(room.id)) {
            p.position = 0;
            p.isReady = false;
        }
        this.advance(room);
    }

    // ------------------------------------------------------------ match flow

    /** Next match in bracket order (ready check), or the end. */
    private advance(room: Room): void {
        const t = room.tournament!;
        this.clearTimer(t);
        const bracket = t.bracket!;
        const end = outcome(bracket);
        const m = end.done ? undefined : nextMatch(bracket);
        if (!m) return this.finish(room, end.championId);

        m.status = "live";
        t.currentMatchId = m.id;
        t.phase = "ready";
        t.readyIds = new Set();
        t.readyDeadline = Date.now() + TOURNAMENT_READY_MS;
        for (const p of this.roomManager.getPlayersInRoom(room.id)) {
            p.isReady = false;
            p.position = p.id === m.p1 ? 1 : p.id === m.p2 ? 2 : 0;
        }
        const matchId = m.id;
        t.timer = setTimeout(() => {
            t.timer = null;
            if (!this.alive(room) || t.phase !== "ready" || t.currentMatchId !== matchId) return;
            this.onReadyTimeout(room);
        }, TOURNAMENT_READY_MS);
        this.broadcastState(room);
    }

    /** `playerReady` in a tournament room: only the two players of the current match count. */
    setReady(room: Room, player: Player, ready: boolean): void {
        const t = room.tournament;
        const pair = this.currentPair(room);
        if (!t || t.phase !== "ready" || !pair?.includes(player.id)) return;
        if (ready) t.readyIds.add(player.id);
        else t.readyIds.delete(player.id);
        player.isReady = ready;
        if (pair.every((id) => t.readyIds.has(id))) this.beginMatch(room, pair);
        else this.broadcastState(room);
    }

    /** A player of the current ready check disconnected: they are not ready any more. */
    unready(room: Room, playerId: string): void {
        const t = room.tournament;
        if (t?.phase !== "ready" || !t.readyIds.delete(playerId)) return;
        this.broadcastState(room);
    }

    private beginMatch(room: Room, pair: [string, string]): void {
        const t = room.tournament!;
        this.clearTimer(t);
        t.phase = "playing";
        t.readyDeadline = null;
        t.matchStartedAt = Date.now();
        room.paused = false;
        this.startGame(room);

        const state = this.getState(room)!;
        const start: GameStartMessage = {
            type: "gameStart",
            data: {
                players: pair.map((id, i) => ({ playerId: id, playerName: this.nameOf(room, id), position: i + 1 })),
                tournamentState: state,
            },
            timestamp: Date.now(),
        };
        this.broadcaster.broadcastToRoom(room.id, start);
        gameStarted(pair);
    }

    private onReadyTimeout(room: Room): void {
        const t = room.tournament!;
        const pair = this.currentPair(room);
        if (!pair) return this.advance(room);
        const ready = pair.filter((id) => t.readyIds.has(id));
        // one showed up: they win; nobody did: nobody advances (the next opponent gets a walkover)
        this.resolve(room, ready.length === 1 ? ready[0]! : null, null, "forfeit");
    }

    /** The tick loop finished the current game. side 0 = p1 (left paddle). */
    onGameOver(room: Room, winnerSide: 0 | 1): void {
        const pair = this.currentPair(room);
        if (!pair || room.tournament?.phase !== "playing") return;
        const s = room.gameServer?.getGameState().scores ?? [0, 0];
        this.resolve(room, pair[winnerSide], [s[0] ?? 0, s[1] ?? 0], "played");
    }

    /**
     * The player gives up their current match (menu, leaving, disconnect grace expired).
     * The opponent wins. False (and nothing happens) if they are not in the current match.
     */
    forfeit(room: Room, loserId: string): boolean {
        const t = room.tournament;
        const pair = this.currentPair(room);
        if (!t || !pair || !pair.includes(loserId) || (t.phase !== "ready" && t.phase !== "playing")) return false;
        const winnerId = pair[0] === loserId ? pair[1] : pair[0];
        let scores: [number, number] | null = null;
        if (t.phase === "playing") {
            const s = room.gameServer?.getGameState().scores ?? [0, 0];
            scores = [s[0] ?? 0, s[1] ?? 0];
        }
        this.resolve(room, winnerId, scores, "forfeit");
        return true;
    }

    /** Single exit from a live match: records it, then the pause before the next one. */
    private resolve(room: Room, winnerId: string | null, scores: [number, number] | null, result: "played" | "forfeit"): void {
        const t = room.tournament!;
        const matchId = t.currentMatchId;
        const m = matchId ? findMatch(t.bracket!, matchId) : undefined;
        if (!m || !matchId) return;
        const [p1, p2] = [m.p1, m.p2];
        const wasPlaying = t.phase === "playing";
        if (!recordResult(t.bracket!, matchId, winnerId, scores, result)) return;
        this.clearTimer(t);

        if (wasPlaying) {
            room.status = "full";
            room.paused = false;
            delete room.gameServer;
            gameEnded([p1, p2].filter((id): id is string => !!id));
            // a game took place: it goes in the report (walkovers and no-shows don't)
            if (p1 && p2 && winnerId && scores) {
                t.records.push({
                    player1Id: p1,
                    player2Id: p2,
                    player1DisplayName: this.nameOf(room, p1),
                    player2DisplayName: this.nameOf(room, p2),
                    player1Score: scores[0],
                    player2Score: scores[1],
                    winnerId,
                    played_at: new Date(t.matchStartedAt).toISOString(),
                    end_at: new Date().toISOString(),
                });
            }
        }
        for (const p of this.roomManager.getPlayersInRoom(room.id)) {
            p.position = 0;
            p.isReady = false;
        }
        t.currentMatchId = null;
        t.readyIds = new Set();
        t.readyDeadline = null;
        t.phase = "between";

        if (winnerId) {
            const msg: TournamentRoundEndMessage = {
                type: "tournamentRoundEnd",
                data: { matchId, winner: { id: winnerId, name: this.nameOf(room, winnerId) } },
                timestamp: Date.now(),
            };
            this.broadcaster.broadcastToRoom(room.id, msg);
        }
        // the final (or the last match anyone is left for): end now, no pause
        const end = outcome(t.bracket!);
        if (end.done) return this.finish(room, end.championId);
        this.broadcastState(room);
        t.timer = setTimeout(() => {
            t.timer = null;
            if (!this.alive(room) || t.phase !== "between") return;
            this.advance(room);
        }, BETWEEN_MATCHES_MS);
    }

    // ------------------------------------------------------------ leaving

    /**
     * The player is leaving the room for good (leaveRoom, or dropped after a disconnect).
     * Call before removing them from the room. Forfeits their live match, marks them out of
     * the bracket (later matches become walkovers) and hands the host role on.
     */
    onLeaving(room: Room, player: Player): void {
        const t = room.tournament;
        if (!t) return;
        if (t.phase === "registration") {
            t.players = t.players.filter((p) => p.id !== player.id);
            if (t.hostId === player.id) {
                const next = room.playerIds.find((id) => id !== player.id);
                if (next) t.hostId = next;
            }
            return;
        }
        const entry = t.players.find((p) => p.id === player.id);
        if (!entry || entry.withdrawn) return;
        if (t.phase === "finished") return;
        this.forfeit(room, player.id);
        entry.withdrawn = true;
        gameEnded([player.id]);
        withdraw(t.bracket!, player.id);
        // no pending transition (should not happen): move on now
        if (t.phase === "ready" && this.currentPair(room) === null) this.advance(room);
    }

    /** After the leaver is out of room.playerIds: tell the others (if anyone is left). */
    afterLeft(room: Room): void {
        if (this.alive(room)) this.broadcastState(room);
    }

    // ------------------------------------------------------------ end

    private finish(room: Room, championId: string | null): void {
        const t = room.tournament!;
        this.clearTimer(t);
        t.phase = "finished";
        t.currentMatchId = null;
        t.readyDeadline = null;
        t.championId = championId;
        room.status = "finished";

        const end: TournamentEndMessage = {
            type: "tournamentEnd",
            data: { winner: championId ? { id: championId, name: this.nameOf(room, championId) } : null },
            timestamp: Date.now(),
        };
        this.broadcaster.broadcastToRoom(room.id, end);
        this.broadcastState(room);

        // Report only a real tournament: a champion and at least one game played
        const winnerId = championId ? parseInt(championId, 10) : NaN;
        if (!Number.isInteger(winnerId) || winnerId < 1 || t.records.length === 0) return;
        const toId = (id: string) => parseInt(id, 10);
        reportTournamentResult({
            tournamentKey: t.key,
            name: `Tournament ${room.id}`,
            winnerId,
            start_at: new Date(t.startedAt).toISOString(),
            end_at: new Date().toISOString(),
            players: t.players.map((p) => ({ userId: toId(p.id) })).filter((p) => Number.isInteger(p.userId) && p.userId >= 1),
            matches: t.records.map((m) => ({
                player1Id: toId(m.player1Id),
                player2Id: toId(m.player2Id),
                player1DisplayName: m.player1DisplayName,
                player2DisplayName: m.player2DisplayName,
                player1Score: m.player1Score,
                player2Score: m.player2Score,
                winnerId: toId(m.winnerId),
                played_at: m.played_at,
                end_at: m.end_at,
            })),
        });
    }
}
