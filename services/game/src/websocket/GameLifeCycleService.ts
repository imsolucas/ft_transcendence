import type { PlayerReadyMessage } from "shared/index.js";
import type { RoomManager } from "../game/roomManager.js";
import type { Room } from "../types/room.types.js";

export default class GameLifeCycleService {
    constructor (
        private roomManager: RoomManager
    ) {}

    setReady(message: PlayerReadyMessage): boolean {
        // Implementation will set player ready state
        // For now, just a placeholder
        return true;
    }

    checkReady(room: Room): boolean {
        const players = this.roomManager.getPlayersInRoom(room.id);
        return players.every(p => p.isReady) && players.length >= 2;
    }

    startGame(room: Room): boolean {
        // Implementation will start the game
        return true;
    }
}