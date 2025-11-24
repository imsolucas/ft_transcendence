import type { BaseMessage, CreateRoomMessage, GameMessage, JoinQueueMessage, JoinRoomMessage, TournamentStateMessage, Player, PlayerInputMessage, PlayerReadyMessage, ErrorMessage, GameErrorCodes, PlayerJoinedMessage, GameStartMessage, PlayerLeftMessage, QueueJoinedMessage, ConnectionMessage, TournamentState } from "shared/index.js";
import { toSerializablePlayer } from "shared/index.js";
import type { RoomManager } from "../game/roomManager.js";
import { MessageBroadcaster } from "./Broadcaster.js";
import GameService from "./GameService.js";
import RoomService from "./RoomService.js";
import TournamentService from "./TournamentService.js";

export default class NewMessageHandler {
    private tournamentService: TournamentService
    private gameService: GameService
    private roomService: RoomService
    private broadcaster: MessageBroadcaster

    constructor ( private roomManager: RoomManager ) {
        this.broadcaster = new MessageBroadcaster(roomManager);
        this.tournamentService = new TournamentService(roomManager, this.broadcaster);
        this.gameService = new GameService(roomManager, this.broadcaster);
        this.roomService = new RoomService(roomManager);
    }

    handleConnection(message: ConnectionMessage, connection: any): Player | null {
        const newPlayer: Player = {
            id: message.data.playerId,
            name: message.data.playerName,
            socket: connection,
            roomId: '',
            position: 0,
            connectedAt: Date.now(),
            isReady: false,
            picture: message.data.picture
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
        const config = message.data.config;
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

        const response: PlayerJoinedMessage = {
            type: 'playerJoined',
            data: {
                playerName: player.name,
                playerId: player.id,
                roomId: room.id,
                position: player.position,
                picture: player.picture,
                playersInRoom: this.roomService.getPlayersInRoom(room.id).map(toSerializablePlayer)
            },
            timestamp: Date.now()
        };

        this.broadcaster.broadcastToRoom(room.id, response);
    }

    handleJoinQueue(message: JoinQueueMessage, player: Player) {
        const result = this.roomService.joinQueue(player, message.data.roomType);
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
            const response: PlayerJoinedMessage = {
                type: 'playerJoined',
                data: {
                    playerName: player.name,
                    playerId: player.id,
                    roomId: result.room.id,
                    position: player.position,
                    picture: player.picture,
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
                        picture: result.matchedPlayer.picture,
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
            this.sendError("Room doesn't exist", 'ROOM_NOT_FOUND', player.socket);
            return;
        }

        const joined = this.roomService.joinRoom(player, roomId);
        if (!joined) {
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
                picture: player.picture,
                playersInRoom: this.roomService.getPlayersInRoom(roomId).map(toSerializablePlayer)
            },
            timestamp: Date.now()
        };

        this.broadcaster.broadcastToRoom(roomId, response);
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
                playerName: player.name
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
                playerName: player.name
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
                    tournamentState: tournamentState ? tournamentState : undefined
                },
                timestamp: Date.now()
            };
            
            console.log("GameStartState", startMessage);

            this.broadcaster.broadcastToRoom(room.id, startMessage);
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
}