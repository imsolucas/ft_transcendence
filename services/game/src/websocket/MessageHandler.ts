import type { BaseMessage, CreateRoomMessage, GameMessage, JoinQueueMessage, JoinRoomMessage, TournamentStateMessage, Player, PlayerInputMessage, PlayerReadyMessage, ErrorMessage, GameErrorCodes, PlayerJoinedMessage, GameStartMessage, PlayerLeftMessage, QueueJoinedMessage, ConnectionMessage, TournamentState } from "shared/index.ts";
import { toSerializablePlayer, default_config } from "shared/index.ts";
import type { GameConfig } from "shared/index.ts";

/**
 * The server builds every room's config itself: physics (speeds, sizes) always come from the
 * defaults, and only these choices are taken from the client, each from an allowed set.
 */
export function roomConfigFrom(input: unknown): GameConfig {
    const c = (input && typeof input === "object" ? input : {}) as Partial<GameConfig>;
    const base = structuredClone(default_config.standardGame);
    const mode = c.mode === "tournament" ? "tournament" : "standard";
    const pointsToWin = [3, 5, 7, 11].includes(c.pointsToWin as number) ? (c.pointsToWin as number) : mode === "tournament" ? 3 : 5;
    const numPlayers = mode === "tournament" && [4, 6, 8].includes(c.numPlayers as number) ? (c.numPlayers as number) : undefined;
    return { ...base, isPrivate: c.isPrivate === true, mode, pointsToWin, ...(numPlayers ? { numPlayers } : {}) };
}
import type { RoomManager } from "../game/roomManager.ts";
import { MessageBroadcaster } from "./Broadcaster.ts";
import GameService from "./GameService.ts";
import RoomService from "./RoomService.ts";
import TournamentService from "./TournamentService.ts";
import type { ConnectionErrorMessage } from "shared/index.ts";
import type { AuthenticatedUser } from "../auth/usersClient.ts";
import { gameStarted } from "../presence.ts";
import { MatchLifecycle } from "./MatchLifecycle.ts";

const WS_OPEN = 1;

export default class NewMessageHandler {
    private tournamentService: TournamentService
    private gameService: GameService
    private roomService: RoomService
    private broadcaster: MessageBroadcaster
    readonly lifecycle: MatchLifecycle

    // one shared broadcaster: index.ts attaches the spectator mirror to it
    constructor ( private roomManager: RoomManager, broadcaster?: MessageBroadcaster ) {
        this.broadcaster = broadcaster ?? new MessageBroadcaster(roomManager);
        this.tournamentService = new TournamentService(roomManager, this.broadcaster);
        this.gameService = new GameService(roomManager, this.broadcaster);
        this.roomService = new RoomService(roomManager);
        this.lifecycle = new MatchLifecycle(roomManager, this.broadcaster, (p) => this.handleDisconnection(p));
    }

    /** Matchmaking queue sizes per mode (read by /metrics). */
    queueLengths(): { standard: number; tournament: number } {
        return this.roomService.queueLengths();
    }

    /** The socket behind `player` closed: hold a 1v1 player for a reconnect, otherwise drop them. */
    handleSocketClosed(player: Player): void {
        if (!this.lifecycle.onSocketClosed(player)) this.handleDisconnection(player);
    }

    /**
     * Registers the authenticated user as a player. Identity, name and avatar come from the
     * session resolved at handshake (`user`); anything the client sends about itself is ignored.
     */
    handleConnection(_message: ConnectionMessage, connection: any, user: AuthenticatedUser): Player | null {
        const id = String(user.id); // TickSystem parses this back with parseInt

        // Back within the reconnect grace period: reattach to the paused match (no
        // connectionSuccess, so the client doesn't start a new search/room)
        const rejoined = this.lifecycle.tryRejoin(id, connection);
        if (rejoined) return rejoined;

        const existing = this.roomManager.getPlayer(id);
        if (existing && existing.socket !== connection && existing.socket.readyState === WS_OPEN) {
            const refusal: ConnectionErrorMessage = {
                type: 'connectionError',
                data: { message: 'Already connected in another tab or window.', code: 'ALREADY_CONNECTED' },
                timestamp: Date.now()
            };
            connection.send(JSON.stringify(refusal));
            connection.close(4409, 'Already connected');
            return null;
        }

        const newPlayer: Player = {
            id,
            name: user.displayName,
            socket: connection,
            roomId: '',
            position: 0,
            connectedAt: Date.now(),
            isReady: false,
            picture: user.avatar ?? ''
        };

        const response = {
            type: 'connectionSuccess',
            timestamp: Date.now()
        };

        this.roomManager.addPlayer(newPlayer);
        connection.send(JSON.stringify(response));
        return newPlayer;
    }

    handleDisconnection(player: Player): void {
        const wasInQueue = this.roomService.leaveQueue(player);
        const room = this.roomService.leaveRoom(player);

        if (room) {
            const leaveMessage: PlayerLeftMessage = {
                type: 'playerLeft',
                data: { playerName: player.name, playerId: player.id },
                timestamp: Date.now()
            };
            this.broadcaster.broadcastToRoom(room.id, leaveMessage, player.id);
        }

        this.roomManager.removePlayer(player.id);
    }

    routeMessage(message: GameMessage, player: Player): void {
        switch (message.type) {
            case "createRoom":
                this.handleCreateRoom(message as CreateRoomMessage, player);
                break;
            case "joinRoom":
                this.handleJoinRoom(message as JoinRoomMessage, player);
                break;
            case "joinQueue":
                this.handleJoinQueue(message as JoinQueueMessage, player);
                break;
            case "leaveRoom":
                this.handleLeaveRoom(player);
                break;
            case "leaveQueue":
                this.handleLeaveQueue(player);
                break;
            case "playerReady":
                this.handlePlayerReady(message as PlayerReadyMessage, player);
                break;
            case "playerInput":
                this.handlePlayerInput(message as PlayerInputMessage, player);
                break;
            case "forfeit":
                this.lifecycle.forfeit(player);
                break;
            case "rematch":
                this.lifecycle.requestRematch(player);
                break;
          default:
            console.error(`[Router] ERROR: Unknown message type: ${message.type}`);
        }
    }

    handleCreateRoom(message: CreateRoomMessage, player: Player) {
        const config = roomConfigFrom(message.data?.config);
        const room = this.roomService.createRoom(player, config);
        if (!room) {
            this.sendError("Already in room", "ALREADY_IN_ROOM", player.socket);
            return;
        }

        const joined = this.roomService.joinRoom(player, room.id);
        if (!joined) {
            this.sendError("Failed to join", "JOIN_FAILED", player.socket);
            return;
        }

        this.broadcastPlayerJoined(room.id, player);
    }

    handleJoinQueue(message: JoinQueueMessage, player: Player) {
        // only the two known modes; anything else is a standard match (never a custom mode)
        const roomType = message.data?.roomType === "tournament" ? "tournament" : "standard";
        const result = this.roomService.joinQueue(player, roomType);
        if (!result) {
            this.sendError("Player already in room", 'ALREADY_IN_ROOM', player.socket);
            return;
        }

        // Player added to queue - send waiting message
        if (result.queued) {
            const position = this.roomService.getQueuePosition(player.id);
            const queueLength = this.roomService.getQueueLength();

            const response: QueueJoinedMessage = {
                type: 'queueJoined',
                data: {
                    position: position,
                    queueLength: queueLength
                },
                timestamp: Date.now()
            };
            player.socket.send(JSON.stringify(response));
            return;
        }

        // Match found - notify all players in room
        if (result.room) {
            // When a match is found, both players are already in the room
            // Just broadcast once for the player who just joined (the second player)
            this.broadcastPlayerJoined(result.room.id, player);
        }
    }

    handleJoinRoom(message: JoinRoomMessage, player: Player) {
        const roomId = message.data.roomId;

        if (!roomId) {
            this.sendError("Room doesn't exist", 'ROOM_NOT_FOUND', player.socket);
            return;
        }

        const joined = this.roomService.joinRoom(player, roomId);
        if (!joined) {
            this.sendError("Failed to join", "JOIN_FAILED", player.socket);
            return;
        }

        this.broadcastPlayerJoined(roomId, player);
    }

    handleLeaveRoom(player: Player) {
        const room = this.roomService.leaveRoom(player);
        if (!room) {
            this.sendError("Player not in room", 'ROOM_NOT_FOUND', player.socket);
            return;
        }

        const response: PlayerLeftMessage = {
            type: 'playerLeft',
            data: {
                playerName: player.name,
                playerId: player.id
            },
            timestamp: Date.now()
        };

        this.broadcaster.broadcastToRoom(room.id, response, player.id);
    }

    handleLeaveQueue(player: Player) {
        const wasInQueue = this.roomService.leaveQueue(player);
        if (!wasInQueue) {
            this.sendError("Player not in queue", 'INVALID_REQUEST', player.socket);
            return;
        }

        const response = {
            type: 'queueLeft',
            data: {
                playerName: player.name,
                playerId: player.id
            },
            timestamp: Date.now()
        };
        player.socket.send(JSON.stringify(response));
    }

    handlePlayerReady(message: PlayerReadyMessage, player: Player) {
        const success = this.gameService.setReady(message, player);
        if (!success.setReady) {
            this.sendError("Player not in room", 'ROOM_NOT_FOUND', player.socket);
        }

        const readyMessage: PlayerReadyMessage = {
            type: 'playerReady',
            data: {
                playerName: player.name,
                playerId: player.id,
                ready: message.data.ready
            },
            timestamp: Date.now()
        };

        this.broadcaster.broadcastToRoom(player.roomId, readyMessage);

        if (success.startGame) {
            const room = this.roomManager.getRoom(player.roomId);
            if (!room) return;
            this.lifecycle.clearReadyDeadline(room.id);
            const playersInRoom = this.roomManager.getPlayersInRoom(room.id);

            let tournamentState: TournamentState | null = null;
            if (room.mode === 'tournament') {
                this.tournamentService.assignRoles(room);
                tournamentState = this.tournamentService.getRoomTournamentState(room.id);
            }

            const startMessage: GameStartMessage = {
                type: 'gameStart',
                data: {
                    players: playersInRoom.map(p => ({
                    playerId: p.id,
                    playerName: p.name,
                    position: p.position,
                    })),
                    ...(tournamentState && { tournamentState })
                },
                timestamp: Date.now()
            };

            this.broadcaster.broadcastToRoom(room.id, startMessage);
            gameStarted(room.playerIds);
        }
    }

    handlePlayerInput(message: PlayerInputMessage, player: Player) {
        const success = this.gameService.playerInput(message, player);
        if (!success) {
            this.sendError("Invalid Room", 'INVALID_REQUEST', player.socket);
            return;
        }
    }

    private sendError(errorMessage: string, code: GameErrorCodes, socket: WebSocket) {
        const errorResponse: ErrorMessage = {
            type: 'Error',
            data: { message: errorMessage, code: code },
            timestamp: Date.now()
          };
        socket.send(JSON.stringify(errorResponse));
    }

    private broadcastPlayerJoined(roomId: string, player: Player): void {
        const response: PlayerJoinedMessage = {
            type: 'playerJoined',
            data: {
                playerName: player.name,
                playerId: player.id,
                roomId: roomId,
                position: player.position,
                picture: player.picture,
                playersInRoom: this.roomService.getPlayersInRoom(roomId).map(toSerializablePlayer)
            },
            timestamp: Date.now()
        };
        this.broadcaster.broadcastToRoom(roomId, response);

        const room = this.roomManager.getRoom(roomId);
        if (room && room.mode === "standard" && this.roomManager.isRoomFull(roomId)) this.lifecycle.armReadyDeadline(room);
    }
}