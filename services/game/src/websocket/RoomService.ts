import type { GameConfig, Player } from "shared/index.js";
import type { RoomManager } from "../game/roomManager.js";
import type { Room } from "../types/room.types.js";
import { config } from "process";

export default class RoomService {
    constructor (
        private roomManager: RoomManager
    ){}

    createRoom(player: Player, config: GameConfig): Room {
        const room = this.roomManager.createRoom(config);
        return room;
    }

    joinRoom(player: Player, roomId: string): boolean {
        const room = this.roomManager.getRoom(roomId);
        
        if (!this.roomManager.addPlayerToRoom(roomId, player.id))
            return false
        
        return true
    }

    joineQueue(player: Player) {
        
    }

    leaveRoom(player: Player) {

    }
}