import type { PlayerInputMessage, PlayerReadyMessage } from "shared/index.js";
import type { Player } from "shared"
import type { RoomManager } from "../game/roomManager.js";
import type { Room } from "../types/room.types.js";
import { GameServer } from "../game/GameServer.js";
import { MessageBroadcaster } from "./Broadcaster.js";

export default class GameService {
    constructor (
        private roomManager: RoomManager,
        private broadcaster: MessageBroadcaster
    ) {}

    setReady(message: PlayerReadyMessage, player: Player): {setReady: boolean; startGame: boolean} {
        const room = this.roomManager.getRoom(player.roomId);
        if (!room) return {setReady: false, startGame: false};

        player.isReady = message.data.ready;

        if (this.checkReady(room)) {
            this.startGame(room);
            return {setReady: true, startGame: true}
        }
        return {setReady: true, startGame: false};
    }

    checkReady(room: Room): boolean {
        const players = this.roomManager.getPlayersInRoom(room.id);
        return players.every(p => p.isReady) && players.length >= 2;
    }

    startGame(room: Room): boolean {
        room.gameServer = new GameServer(room, this.broadcaster);
        room.status = 'playing';
        return true;
    }

    playerInput(message: PlayerInputMessage, player: Player) : boolean {
        const room = this.roomManager.getRoom(player.roomId);
        if (!room) return false;

        if (!room.gameServer) return false;

        if (this.roomManager.getPlayer(room.playerIds[0]!)!.name == player.name)
            room.gameServer.input(message.data.inputs, undefined);
        else
            room.gameServer.input(undefined, message.data.inputs);
        return true;
    }
}