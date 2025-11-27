import { default_config, type GameConfig, type Player } from "shared/index.js";
import type { RoomManager } from "../game/roomManager.js";
import type { Room } from "../types/room.types.js";

export default class RoomService {
    private standardQueue: Player[] = [];
    private tournamentQueue: Player[] = [];

    constructor (
        private roomManager: RoomManager
    ){}

    createRoom(player: Player, config: GameConfig): Room | null {
        if (player.roomId) {
            return null;
        }

        const room = this.roomManager.createRoom(config);
        room.status = 'waiting';
        return room;
    }

    joinRoom(player: Player, roomId: string): boolean {
        const room = this.roomManager.getRoom(roomId);
        if (!room) return false;

        if (!this.roomManager.addPlayerToRoom(roomId, player.id))
            return false

        if (this.roomManager.isRoomFull(roomId))
            room.status = 'full';
        return true
    }

    joinQueue(player: Player, mode: 'tournament' | 'standard'): { room?: Room; queued: boolean; matchedPlayer?: Player } | null {
        if (player.roomId) {
            return null;
        }

        var availableRooms: Room[] = []
        this.roomManager.getAvailableRooms().forEach((val) => {
            if (val.mode == mode)
                availableRooms.push(val);
        });
        const firstRoom = availableRooms[0]
        if (firstRoom) {
            const success = this.roomManager.addPlayerToRoom(firstRoom.id, player.id);
            if (success) {
                const room = this.roomManager.getRoom(firstRoom.id);
                if (room && this.roomManager.isRoomFull(room.id)) {
                    room.status = 'full';
                }
                return { room: firstRoom, queued: false };
            }
        }

        const queue = mode === 'tournament' ? this.tournamentQueue : this.standardQueue;

        if (queue.length > 0) {
            const waitingPlayer = queue.shift()!;

            const config = mode === 'tournament'
                ? { ...default_config.tournamentGame }
                : { ...default_config.standardGame };
            const room = this.roomManager.createRoom(config);

            this.roomManager.addPlayerToRoom(room.id, waitingPlayer.id);
            this.roomManager.addPlayerToRoom(room.id, player.id);

            if (this.roomManager.isRoomFull(room.id)) {
                room.status = 'full';
            }

            return { room, queued: false, matchedPlayer: waitingPlayer };
        }

        queue.push(player);
        return { queued: true };
    }

    leaveQueue(player: Player): boolean {
        // Check both queues
        let index = this.standardQueue.findIndex(p => p.id === player.id);
        if (index !== -1) {
            this.standardQueue.splice(index, 1);
            return true;
        }

        index = this.tournamentQueue.findIndex(p => p.id === player.id);
        if (index !== -1) {
            this.tournamentQueue.splice(index, 1);
            return true;
        }

        return false;
    }

    leaveRoom(player: Player): Room | null {
        if (!player.roomId) return null;

        const room = this.roomManager.getRoom(player.roomId);
        if (!room) return null;

        const success = this.roomManager.removePlayerFromRoom(player.roomId, player.id);
        if (!success) return null;

        room.status = 'waiting';
        return room;
    }

    getPlayersInRoom(roomId: string): Player[] {
        return this.roomManager.getPlayersInRoom(roomId);
    }

    getQueuePosition(playerId: string): number {
        // Check standard queue first
        let index = this.standardQueue.findIndex(p => p.id === playerId);
        if (index !== -1) return index + 1; // 1-indexed position

        // Check tournament queue
        index = this.tournamentQueue.findIndex(p => p.id === playerId);
        return index === -1 ? -1 : index + 1;
    }

    getQueueLength(): number {
        // Return the total length of both queues (or could be split by mode if needed)
        return this.standardQueue.length + this.tournamentQueue.length;
    }

    isInQueue(playerId: string): boolean {
        return this.standardQueue.some(p => p.id === playerId) ||
               this.tournamentQueue.some(p => p.id === playerId);
    }

    private createStandardConfig(): GameConfig {
        return {
            paddleConfig: {
                color: '#ffffff',
                speed: 500,
                size: { x: 10, y: 100 }
            },
            ballConfig: {
                color: '#ffffff',
                speed: 300,
                size: { x: 10, y: 10 }
            },
            courtSize: { x: 800, y: 600 },
            playerNames: [],
            backgroundColor: '#000000',
            pointsToWin: 2,
            isPrivate: false,
            mode: 'standard'
        };
    }
}