import type { PlayerInputMessage, PlayerReadyMessage } from "shared/index.js";
import type { Player } from "shared"
import type { RoomManager } from "../game/roomManager.js";
import type { Room } from "../types/room.types.js";
import { pongSessions } from "../index.js";
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
        console.log(`[GameService] Player ${player.name} set ready: ${player.isReady}`);

        if (this.checkReady(room)) {
            console.log(`[GameService] All players ready! Starting game in room ${room.id}`);
            this.startGame(room);
            return {setReady: true, startGame: true}
        }
        return {setReady: true, startGame: false};
    }

    checkReady(room: Room): boolean {
        const players = this.roomManager.getPlayersInRoom(room.id);
        console.log(`[GameService] Checking ready status:`, players.map(p => ({ name: p.name, ready: p.isReady })));
        return players.every(p => p.isReady) && players.length >= 2;
    }

    startGame(room: Room): boolean {
        room.status = 'playing';
        pongSessions.set(room.id, new GameServer(room, this.broadcaster));
        return true;
    }

    playerInput(message: PlayerInputMessage, player: Player) : boolean {
        const room = this.roomManager.getRoom(player.id);
        if (!room) return false;

        const session = pongSessions.get(room.id);
        if (!session) return false;

        if (room.playerIds[0] == player.id)
            session.input(message.data.inputs, undefined);
        else
            session.input(undefined, message.data.inputs);
        return true;
    }
}