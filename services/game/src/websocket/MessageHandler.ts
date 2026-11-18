import type { CreateRoomMessage, GameMessage, JoinQueueMessage, JoinRoomMessage, Player, PlayerInputMessage, PlayerReadyMessage, ErrorMessage, GameErrorCodes, PlayerJoinedMessage, GameStartMessage, PlayerLeftMessage, QueueJoinedMessage, ConnectionMessage } from "shared/index.ts";
import { toSerializablePlayer, default_config } from "shared/index.ts";
import type { GameConfig } from "shared/index.ts";

/**
 * The server builds every room's config itself: physics (speeds, sizes) always come from the
 * defaults, and only these choices are taken from the client, each from an allowed set.
 */
export function roomConfigFrom(input: unknown): GameConfig {
    const c = (input && typeof input === "object" ? input : {}) as Partial<GameConfig>;
    const base = structuredClone(default_config.standardGame);
    // party: a private room by code (the public ones come from the party queues); Pong or Light Cycles
    if (c.mode === "party") return partyConfig(true, c.partyGame === "cycles" ? "cycles" : "pong");
    const mode = c.mode === "tournament" ? "tournament" : "standard";
    const pointsToWin = [3, 5, 7, 11].includes(c.pointsToWin as number) ? (c.pointsToWin as number) : mode === "tournament" ? 3 : 5;
    const numPlayers = mode === "tournament" && [4, 6, 8].includes(c.numPlayers as number) ? (c.numPlayers as number) : undefined;
    return { ...base, isPrivate: c.isPrivate === true, mode, pointsToWin, ...(numPlayers ? { numPlayers } : {}) };
}
import type { RoomManager } from "../rooms/roomManager.ts";
import { MessageBroadcaster } from "./Broadcaster.ts";
import GameService from "./GameService.ts";
import RoomService from "./RoomService.ts";
import TournamentService from "./TournamentService.ts";
import type { ConnectionErrorMessage } from "shared/index.ts";
import type { AuthenticatedUser } from "../users-api/client.ts";
import { gameStarted } from "../presence.ts";
import { MatchLifecycle } from "./MatchLifecycle.ts";
import PartyService, { partyConfig } from "./PartyService.ts";

const WS_OPEN = 1;

export default class NewMessageHandler {
    readonly tournamentService: TournamentService
    private gameService: GameService
    private roomService: RoomService
    private broadcaster: MessageBroadcaster
    readonly lifecycle: MatchLifecycle
    readonly partyService: PartyService

    // one shared broadcaster: index.ts attaches the spectator mirror to it
    constructor ( private roomManager: RoomManager, broadcaster?: MessageBroadcaster ) {
        this.broadcaster = broadcaster ?? new MessageBroadcaster(roomManager);
        this.gameService = new GameService(roomManager, this.broadcaster);
        this.tournamentService = new TournamentService(roomManager, this.broadcaster, (room) => this.gameService.startGame(room));
        this.roomService = new RoomService(roomManager);
        this.partyService = new PartyService(
            roomManager,
            this.broadcaster,
            (room, players) => {
                const last = players[players.length - 1];
                if (last) this.broadcastPlayerJoined(room.id, last);
                this.lifecycle.armReadyDeadline(room);
            },
            (room) => this.lifecycle.clearReadyDeadline(room.id)
        );
        this.lifecycle = new MatchLifecycle(roomManager, this.broadcaster, (p) => this.handleDisconnection(p), this.tournamentService, this.partyService);
    }

    /** The socket behind `player` closed: hold a match/bracket player for a reconnect, otherwise drop them. */
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
            picture: user.avatar ?? '',
            ...(user.look ? { look: user.look } : {}),
            ...(user.rating !== null ? { rating: user.rating } : {}),
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
        this.roomService.leaveQueue(player);
        this.partyService.leaveQueue(player);
        this.leaveCurrentRoom(player);
        this.roomManager.removePlayer(player.id);
    }

    /** Leaves the player's room (a tournament forfeits their match first); null if not in one. */
    private leaveCurrentRoom(player: Player) {
        const current = player.roomId ? this.roomManager.getRoom(player.roomId) : undefined;
        if (current?.mode === 'tournament') this.tournamentService.onLeaving(current, player);
        // a party in play: the leaver is out and their side becomes a wall
        if (current?.mode === 'party') this.partyService.eliminate(current, player.id);
        const room = this.roomService.leaveRoom(player);
        if (!room) return null;
        const leaveMessage: PlayerLeftMessage = {
            type: 'playerLeft',
            data: { playerName: player.name, playerId: player.id },
            timestamp: Date.now()
        };
        this.broadcaster.broadcastToRoom(room.id, leaveMessage, player.id);
        if (room.mode === 'tournament') this.tournamentService.afterLeft(room);
        // the last one who wasn't ready left: the rest may start now
        if (room.mode === 'party' && this.roomManager.getRoom(room.id)) this.partyService.recheckReady(room);
        return room;
    }

    routeMessage(message: GameMessage, player: Player): void {
        // one search at a time: starting anything else leaves the party queue (idempotent)
        if (message.type === "createRoom" || message.type === "joinRoom" || (message.type === "joinQueue" && message.data?.roomType !== "party")) {
            this.partyService.leaveQueue(player);
        }
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
            case "startTournament":
                this.handleStartTournament(player);
                break;
          default:
            console.error(`[Router] ERROR: Unknown message type: ${message.type}`);
        }
    }

    handleCreateRoom(message: CreateRoomMessage, player: Player) {
        this.roomService.leaveQueue(player); // never queued and seated at the same time
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
        if (message.data?.roomType === "party") {
            this.roomService.leaveQueue(player);
            const game = message.data?.game === "cycles" ? "cycles" : "pong";
            if (!this.partyService.joinQueue(player, game)) this.sendError("Player already in room", 'ALREADY_IN_ROOM', player.socket);
            return;
        }
        // only the known modes; anything else is a standard match (never a custom mode)
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
        this.roomService.leaveQueue(player);
        const roomId = message.data?.roomId;

        if (!roomId || typeof roomId !== 'string') {
            this.sendError("Room doesn't exist", 'ROOM_NOT_FOUND', player.socket);
            return;
        }
        // a party code only joins from the party screen, and the party screen only joins parties
        const target = this.roomManager.getRoom(roomId);
        if (target && (target.mode === 'party') !== (message.data?.mode === 'party')) {
            this.sendError("Failed to join", "JOIN_FAILED", player.socket);
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
        const room = this.leaveCurrentRoom(player);
        if (!room) {
            this.sendError("Player not in room", 'ROOM_NOT_FOUND', player.socket);
        }
    }

    /** Host closes registration early (3+ players); identity is the socket's player. */
    handleStartTournament(player: Player) {
        const room = player.roomId ? this.roomManager.getRoom(player.roomId) : undefined;
        if (!room || room.mode !== 'tournament' || !this.tournamentService.requestStart(room, player)) {
            this.sendError("Can't start this tournament", 'INVALID_REQUEST', player.socket);
        }
    }

    handleLeaveQueue(player: Player) {
        const wasInQueue = this.roomService.leaveQueue(player) || this.partyService.leaveQueue(player);
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
        const ready = message.data?.ready === true;
        const current = player.roomId ? this.roomManager.getRoom(player.roomId) : undefined;
        if (current?.mode === 'tournament') {
            // only the two players of the current bracket match ready up; the state says who did
            this.tournamentService.setReady(current, player, ready);
            return;
        }
        if (current?.mode === 'party') {
            this.partyService.setReady(current, player, ready);
            return;
        }
        message.data = { ready };
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

            const startMessage: GameStartMessage = {
                type: 'gameStart',
                data: {
                    players: playersInRoom.map(p => ({
                    playerId: p.id,
                    playerName: p.name,
                    position: p.position,
                    })),
                },
                timestamp: Date.now()
            };

            this.broadcaster.broadcastToRoom(room.id, startMessage);
            gameStarted(room.playerIds);
        }
    }

    handlePlayerInput(message: PlayerInputMessage, player: Player) {
        const room = player.roomId ? this.roomManager.getRoom(player.roomId) : undefined;
        if (room?.mode === 'party') {
            const inputs = message.data?.inputs;
            this.partyService.input(room, player, inputs && typeof inputs === 'object' ? inputs : undefined);
            return;
        }
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
                playersInRoom: this.roomService.getPlayersInRoom(roomId).map(toSerializablePlayer),
                ...(this.roomManager.getRoom(roomId)?.mode === 'party' ? { game: this.roomManager.getRoom(roomId)!.config.partyGame ?? 'pong' } : {}),
            },
            timestamp: Date.now()
        };
        this.broadcaster.broadcastToRoom(roomId, response);

        const room = this.roomManager.getRoom(roomId);
        if (room?.mode === "tournament") this.tournamentService.onJoined(room, player);
        else if (room && room.mode === "standard" && this.roomManager.isRoomFull(roomId)) this.lifecycle.armReadyDeadline(room);
    }
}