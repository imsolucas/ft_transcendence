import type { BaseMessage, CreateRoomMessage, GameMessage, JoinQueueMessage, JoinRoomMessage, LeaveRoomMessage, Player, PlayerInputMessage, PlayerReadyMessage, ErrorMessage, GameErrorCodes } from "shared/index.js";
import type { RoomManager } from "../game/roomManager.js";
import { MessageBroadcaster } from "./Broadcaster.js";
import GameLifeCycleService from "./GameLifeCycleService.js";
import RoomService from "./RoomService.js";
import TournamentService from "./TournamentService.js";

export default class NewMessageHandler {
    private tournamentService: TournamentService
    private gameService: GameLifeCycleService
    private roomService: RoomService
    private broadcaster: MessageBroadcaster

    constructor (roomManager: RoomManager) {
        this.tournamentService = new TournamentService(roomManager);
        this.gameService = new GameLifeCycleService(roomManager);
        this.roomService = new RoomService(roomManager);
        this.broadcaster = new MessageBroadcaster(roomManager)
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
                this.handleDisconnection(player);
                break;
            case "playerReady":
                this.handlePlayerReady(message as PlayerReadyMessage, player);
                break;
            case "playerInput":
                this.handlePlayerInput(message as PlayerInputMessage, player);
                break;
          default:
            console.error('Unknown message type:', message.type);
        }
    }

    handleCreateRoom(message: CreateRoomMessage, player: Player) {
        const config = message.data.config;

        const newRoom = this.roomService.createRoom(player, config);
        this.roomService.joinRoom(player, newRoom.id);

        this.broadcaster.broadCastPlayerJoined(player, )
    }

    handleJoinQueue(message: JoinQueueMessage, player: Player) {
        this.roomService.joineQueue(player);
    }

    handleJoinRoom(message: JoinRoomMessage, player: Player) {
        const roomId = message.data.roomId

        if (!this.roomService.joinRoom(player, roomId)) {
        }
    }

    handleDisconnection(player: Player) {

    }

    handlePlayerReady(message: PlayerReadyMessage, player: Player) {

    }

    handlePlayerInput(message: PlayerInputMessage, player: Player) {

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