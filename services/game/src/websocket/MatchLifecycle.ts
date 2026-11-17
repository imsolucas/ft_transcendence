import type { GameEndMessage, OpponentReconnectedMessage, OpponentReconnectingMessage, Player, ReadyTimeoutMessage, RejoinedMessage, RematchReadyMessage, RematchRequestedMessage } from "shared/index.ts";
import { toSerializablePlayer } from "shared/index.ts";
import type { RoomManager } from "../game/roomManager.ts";
import type { Room } from "../types/room.types.ts";
import type { MessageBroadcaster } from "./Broadcaster.ts";
import { reportMatchResult } from "../utils/reportResults.ts";
import { gameEnded } from "../presence.ts";

export const RECONNECT_GRACE_MS = 15_000;
export const READY_DEADLINE_MS = 30_000;

const WS_OPEN = 1;

/**
 * 1v1 match lifecycle around the core game: reconnect grace, forfeits, rematches and the
 * ready-check deadline. Tournaments keep their existing (leave = drop) behaviour.
 */
export class MatchLifecycle {
  private pending = new Map<string, { roomId: string; timer: ReturnType<typeof setTimeout> }>();
  private rematchVotes = new Map<string, Set<string>>();
  private readyTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private roomManager: RoomManager,
    private broadcaster: MessageBroadcaster,
    /** removes a player for good (queue, room, storage) and tells the room */
    private dropPlayer: (player: Player) => void
  ) {}

  // ---------------------------------------------------------------- reconnect grace

  /** A socket closed. Returns true when the player is being held for a reconnect. */
  onSocketClosed(player: Player): boolean {
    const room = player.roomId ? this.roomManager.getRoom(player.roomId) : undefined;
    if (!room || room.mode !== "standard" || room.status !== "playing") return false;

    room.paused = true;
    const deadline = Date.now() + RECONNECT_GRACE_MS;
    const msg: OpponentReconnectingMessage = {
      type: "opponentReconnecting",
      data: { playerId: player.id, playerName: player.name, deadline },
      timestamp: Date.now(),
    };
    this.broadcaster.broadcastToRoom(room.id, msg, player.id);

    const timer = setTimeout(() => {
      this.pending.delete(player.id);
      // never came back: the other player wins
      this.forfeit(player);
      this.dropPlayer(player);
    }, RECONNECT_GRACE_MS);
    this.pending.set(player.id, { roomId: room.id, timer });
    return true;
  }

  /** Same user connected again during the grace period: reattach the new socket. */
  tryRejoin(playerId: string, socket: Player["socket"]): Player | null {
    const hold = this.pending.get(playerId);
    const player = this.roomManager.getPlayer(playerId);
    if (!hold || !player || player.socket.readyState === WS_OPEN) return null;
    const room = this.roomManager.getRoom(hold.roomId);
    clearTimeout(hold.timer);
    this.pending.delete(playerId);
    if (!room || room.status !== "playing") return null;

    player.socket = socket;
    room.paused = false;
    const rejoined: RejoinedMessage = {
      type: "rejoined",
      data: {
        roomId: room.id,
        playersInRoom: this.roomManager.getPlayersInRoom(room.id).map(toSerializablePlayer),
        gameState: room.gameServer?.getGameState() ?? null,
      },
      timestamp: Date.now(),
    };
    socket.send(JSON.stringify(rejoined));
    const back: OpponentReconnectedMessage = { type: "opponentReconnected", data: { playerId }, timestamp: Date.now() };
    this.broadcaster.broadcastToRoom(room.id, back, playerId);
    return player;
  }

  isHeld(playerId: string) {
    return this.pending.has(playerId);
  }

  // ---------------------------------------------------------------- forfeit

  /** The player gives up (menu or grace timeout): the other player wins and it is recorded. */
  forfeit(player: Player) {
    const room = player.roomId ? this.roomManager.getRoom(player.roomId) : undefined;
    if (!room || room.mode !== "standard" || room.status !== "playing" || !room.gameServer) return;
    const winnerId = room.playerIds.find((id) => id !== player.id);
    const winner = winnerId ? this.roomManager.getPlayer(winnerId) : undefined;
    const state = room.gameServer.getGameState();
    room.status = "finished";
    room.paused = false;

    const end: GameEndMessage = {
      type: "gameEnd",
      data: { winner: winner ? toSerializablePlayer(winner) : toSerializablePlayer(player) },
      timestamp: Date.now(),
    };
    this.broadcaster.broadcastToRoom(room.id, end);
    gameEnded(room.playerIds);

    const [p1Id, p2Id] = room.playerIds;
    const p1 = p1Id ? this.roomManager.getPlayer(p1Id) : undefined;
    const p2 = p2Id ? this.roomManager.getPlayer(p2Id) : undefined;
    if (p1 && p2 && winnerId) {
      reportMatchResult({
        player1Id: parseInt(p1.id),
        player2Id: parseInt(p2.id),
        player1DisplayName: p1.name,
        player2DisplayName: p2.name,
        player1Score: state.scores[0] ?? 0,
        player2Score: state.scores[1] ?? 0,
        winnerId: parseInt(winnerId),
        played_at: new Date(room.createdAt).toISOString(),
        end_at: new Date().toISOString(),
      });
    }
  }

  // ---------------------------------------------------------------- rematch

  requestRematch(player: Player) {
    const room = player.roomId ? this.roomManager.getRoom(player.roomId) : undefined;
    if (!room || room.mode !== "standard" || room.status !== "finished") return;
    const players = this.roomManager.getPlayersInRoom(room.id);
    if (players.length !== 2) return;

    const votes = this.rematchVotes.get(room.id) ?? new Set<string>();
    votes.add(player.id);
    this.rematchVotes.set(room.id, votes);

    if (votes.size < 2) {
      const msg: RematchRequestedMessage = { type: "rematchRequested", data: { playerId: player.id, playerName: player.name }, timestamp: Date.now() };
      this.broadcaster.broadcastToRoom(room.id, msg, player.id);
      return;
    }
    this.rematchVotes.delete(room.id);
    room.status = "full";
    delete room.gameServer;
    room.createdAt = Date.now();
    for (const p of players) p.isReady = false;
    const msg: RematchReadyMessage = {
      type: "rematchReady",
      data: { roomId: room.id, playersInRoom: players.map(toSerializablePlayer) },
      timestamp: Date.now(),
    };
    this.broadcaster.broadcastToRoom(room.id, msg);
    this.armReadyDeadline(room);
  }

  // ---------------------------------------------------------------- ready deadline

  /** Room just filled (or a rematch was agreed): everyone must ready up within the deadline. */
  armReadyDeadline(room: Room) {
    if (room.mode !== "standard") return;
    this.clearReadyDeadline(room.id);
    const timer = setTimeout(() => {
      this.readyTimers.delete(room.id);
      const current = this.roomManager.getRoom(room.id);
      if (!current || current.status === "playing" || current.status === "finished") return;
      const msg: ReadyTimeoutMessage = { type: "readyTimeout", data: { roomId: room.id }, timestamp: Date.now() };
      this.broadcaster.broadcastToRoom(room.id, msg);
      for (const p of this.roomManager.getPlayersInRoom(room.id)) {
        this.roomManager.removePlayerFromRoom(room.id, p.id);
        p.roomId = "";
        p.isReady = false;
      }
    }, READY_DEADLINE_MS);
    this.readyTimers.set(room.id, timer);
  }

  clearReadyDeadline(roomId: string) {
    const t = this.readyTimers.get(roomId);
    if (t) clearTimeout(t);
    this.readyTimers.delete(roomId);
  }
}
