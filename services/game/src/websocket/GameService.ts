import type { PlayerInputMessage, PlayerReadyMessage } from "shared/index.ts";
import type { Player } from "shared"
import type { RoomManager } from "../rooms/roomManager.ts";
import type { Room } from "../types/room.types.ts";
import { GameServer } from "../rooms/GameServer.ts";
import { MessageBroadcaster } from "./Broadcaster.ts";

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
        const minPlayers = room.mode == 'standard' ? 2 : 3;
        return players.every(p => p.isReady) && players.length >= minPlayers;
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

        // Tournament: only the two players of the current bracket match hold a seat (1 or 2);
        // everyone else is at position 0 and watches. Use player position to determine which paddle to control
        // Position 1 = left paddle (player 1), Position 2 = right paddle (player 2)
        if (player.position === 1)
            room.gameServer.input(message.data.inputs, undefined);
        else if (player.position === 2)
            room.gameServer.input(undefined, message.data.inputs);

        return true;
    }
}