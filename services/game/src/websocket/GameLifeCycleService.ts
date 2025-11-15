import type { RoomManager } from "../game/roomManager.js";
import type { Room } from "../types/room.types.js";

export default class GameLifeCycleService {
    constructor (
        private roomManager: RoomManager
    ) {}

    checkReady(room: Room)
    {

    }

    startGame(room: Room)
    {

    }
}