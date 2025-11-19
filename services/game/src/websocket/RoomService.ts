import type { GameConfig, Player } from "shared/index.js";
import type { RoomManager } from "../game/roomManager.js";
import type { Room } from "../types/room.types.js";

export default class RoomService {
    private waitingQueue: Player[] = [];

    constructor (
        private roomManager: RoomManager
    ){}

    createRoom(player: Player, config: GameConfig): Room {
        const room = this.roomManager.createRoom(config);
        return room;
    }

    joinRoom(player: Player, roomId: string): boolean {
        const room = this.roomManager.getRoom(roomId);
        if (!room) return false;

        if (!this.roomManager.addPlayerToRoom(roomId, player.id))
            return false

        return true
    }

    joinQueue(player: Player): { room?: Room; queued: boolean; matchedPlayer?: Player } {
        if (player.roomId) {
            return { queued: false };
        }

        const availableRooms = this.roomManager.getAvailableRooms() || [];
        const standardRoom = availableRooms.find(r => r.type === 'standard');

        if (standardRoom) {
            const success = this.roomManager.addPlayerToRoom(standardRoom.id, player.id);
            if (success) {
                return { room: standardRoom, queued: false };
            }
        }

        if (this.waitingQueue.length > 0) {
            const waitingPlayer = this.waitingQueue.shift()!;

            const config = this.createStandardConfig();
            const room = this.roomManager.createRoom(config);

            this.roomManager.addPlayerToRoom(room.id, waitingPlayer.id);
            this.roomManager.addPlayerToRoom(room.id, player.id);

            return { room, queued: false, matchedPlayer: waitingPlayer };
        }

        this.waitingQueue.push(player);
        return { queued: true };
    }

    leaveQueue(player: Player): boolean {
        const index = this.waitingQueue.findIndex(p => p.id === player.id);
        if (index === -1) return false;

        this.waitingQueue.splice(index, 1);
        return true;
    }

    leaveRoom(player: Player): Room | null {
        if (!player.roomId) return null;

        const room = this.roomManager.getRoom(player.roomId);
        if (!room) return null;

        const success = this.roomManager.removePlayerFromRoom(player.roomId, player.id);
        if (!success) return null;

        return room;
    }

    getPlayersInRoom(roomId: string): Player[] {
        return this.roomManager.getPlayersInRoom(roomId);
    }

    getQueuePosition(playerId: string): number {
        const index = this.waitingQueue.findIndex(p => p.id === playerId);
        return index === -1 ? -1 : index + 1; // 1-indexed position
    }

    getQueueLength(): number {
        return this.waitingQueue.length;
    }

    isInQueue(playerId: string): boolean {
        return this.waitingQueue.some(p => p.id === playerId);
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