import type { BaseMessage, CreateRoomMessage, GameMessage, JoinQueueMessage, JoinRoomMessage, LeaveRoomMessage, Player, PlayerInputMessage, PlayerReadyMessage, ErrorMessage, GameErrorCodes, PlayerJoinedMessage } from "shared/index.js";
import { toSerializablePlayer } from "shared/index.js";
import type { RoomManager } from "../game/roomManager.js";
import { MessageBroadcaster } from "./Broadcaster.js";
import GameLifeCycleService from "./GameLifeCycleService.js";
import RoomService from "./RoomService.js";
import TournamentService from "./TournamentService.js";
import { timeStamp } from "console";

export default class NewMessageHandler {
    private tournamentService: TournamentService
    private gameService: GameLifeCycleService
    private roomService: RoomService
    private broadcaster: MessageBroadcaster

    constructor (private roomManager: RoomManager) {
        this.tournamentService = new TournamentService(roomManager);
        this.gameService = new GameLifeCycleService(roomManager);
        this.roomService = new RoomService(roomManager);
        this.broadcaster = new MessageBroadcaster(roomManager)
    }

    handleConnection(data: any, connection: any): Player | null {
        const playerId = 'player_' + crypto.randomUUID().substring(0, 8).toLowerCase();
        const roomId = "";
        const position = 0;

        const newPlayer: Player = {
            id: playerId,
            name: data.data.playerName,
            socket: connection,
            roomId: roomId,
            position: position,
            connectedAt: Date.now(),
            isReady: false
        };

        const response = {
            type: 'connectionSuccess',
            data: {
                playerId: playerId,
            },
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
            const leaveMessage = {
                type: 'playerLeft',
                data: { playerName: player.name },
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
          default:
            console.error(`[Router] ERROR: Unknown message type: ${message.type}`);
        }
    }

    handleCreateRoom(message: CreateRoomMessage, player: Player) {
        if (player.roomId) {
            console.error(`[CreateRoom] ERROR: Player "${player.name}" already in room ${player.roomId}`);
            this.sendError("Already in room", "ALREADY_IN_ROOM", player.socket);
            return;
        }

        const config = message.data.config;
        const room = this.roomService.createRoom(player, config);
        const joined = this.roomService.joinRoom(player, room.id);

        if (!joined) {
            console.error(`[CreateRoom] ERROR: Failed to join room ${room.id}`);
            this.sendError("Failed to join", "JOIN_FAILED", player.socket);
            return;
        }

        const response: PlayerJoinedMessage = {
            type: 'playerJoined',
            data: {
                playerName: player.name,
                playerId: player.id,
                roomId: room.id,
                position: player.position,
                playersInRoom: this.roomService.getPlayersInRoom(room.id).map(toSerializablePlayer)
            },
            timestamp: Date.now()
        };

        this.broadcaster.broadcastToRoom(room.id, response);
    }

    handleJoinQueue(message: JoinQueueMessage, player: Player) {
        const result = this.roomService.joinQueue(player);

        // Player added to queue - send waiting message
        if (result.queued) {
            const position = this.roomService.getQueuePosition(player.id);
            const queueLength = this.roomService.getQueueLength();

            const response = {
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
            const response: PlayerJoinedMessage = {
                type: 'playerJoined',
                data: {
                    playerName: player.name,
                    playerId: player.id,
                    roomId: result.room.id,
                    position: player.position,
                    playersInRoom: this.roomService.getPlayersInRoom(result.room.id).map(toSerializablePlayer)
                },
                timestamp: Date.now()
            };

            this.broadcaster.broadcastToRoom(result.room.id, response);

            // If we matched with a waiting player, they need notification too
            if (result.matchedPlayer) {
                const matchedResponse: PlayerJoinedMessage = {
                    type: 'playerJoined',
                    data: {
                        playerName: result.matchedPlayer.name,
                        playerId: result.matchedPlayer.id,
                        roomId: result.room.id,
                        position: result.matchedPlayer.position,
                        playersInRoom: this.roomService.getPlayersInRoom(result.room.id).map(toSerializablePlayer)
                    },
                    timestamp: Date.now()
                };
                this.broadcaster.broadcastToRoom(result.room.id, matchedResponse);
            }
        }
    }

    handleJoinRoom(message: JoinRoomMessage, player: Player) {
        const roomId = message.data.roomId;

        if (!roomId) {
            console.error(`[JoinRoom] ERROR: No room ID provided`);
            this.sendError("Room doesn't exist", 'ROOM_NOT_FOUND', player.socket);
            return;
        }

        const joined = this.roomService.joinRoom(player, roomId);
        if (!joined) {
            console.error(`[JoinRoom] ERROR: Failed to join room ${roomId}`);
            this.sendError("Failed to join", "JOIN_FAILED", player.socket);
            return;
        }

        const response: PlayerJoinedMessage = {
            type: 'playerJoined',
            data: {
                playerName: player.name,
                playerId: player.id,
                roomId: roomId,
                position: player.position,
                playersInRoom: this.roomService.getPlayersInRoom(roomId).map(toSerializablePlayer)
            },
            timestamp: Date.now()
        };

        this.broadcaster.broadcastToRoom(roomId, response);
    }

    handleLeaveRoom(player: Player) {
        const room = this.roomService.leaveRoom(player);
        if (!room) {
            return;
        }

        const response = {
            type: 'playerLeft',
            data: {
                playerName: player.name
            },
            timestamp: Date.now()
        };

        this.broadcaster.broadcastToRoom(room.id, response, player.id);
    }

    handleLeaveQueue(player: Player) {
        const wasInQueue = this.roomService.leaveQueue(player);
        if (!wasInQueue) {
            return;
        }

        const response = {
            type: 'queueLeft',
            data: {
                playerName: player.name
            },
            timestamp: Date.now()
        };
        player.socket.send(JSON.stringify(response));
    }

    handlePlayerReady(message: PlayerReadyMessage, player: Player) {
        // this.gameService.setReady(message)
    }

    handlePlayerInput(message: PlayerInputMessage, player: Player) {
        // Handle player input
    }

    private sendError(errorMessage: string, code: GameErrorCodes, socket: WebSocket) {
        const errorResponse: ErrorMessage = {
            type: 'Error',
            data: { message: errorMessage, code: code },
            timestamp: Date.now()
          };
          socket.send(JSON.stringify(errorResponse));
    }
}