import { default_config, type GameConfig, type Player } from "shared/index.ts";
import type { RoomManager } from "../game/roomManager.ts";
import type { Room } from "../types/room.types.ts";

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

        // Update player object with room info from storage
        const updatedPlayer = this.roomManager.getPlayer(player.id);
        if (updatedPlayer) {
            player.roomId = updatedPlayer.roomId;
            player.position = updatedPlayer.position;
        }

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
                // Update player object with room info from storage
                const updatedPlayer = this.roomManager.getPlayer(player.id);
                if (updatedPlayer) {
                    player.roomId = updatedPlayer.roomId;
                    player.position = updatedPlayer.position;
                }
                const room = this.roomManager.getRoom(firstRoom.id);
                if (room && this.roomManager.isRoomFull(room.id)) {
                    room.status = 'full';
                }
                return { room: firstRoom, queued: false };
            }
        }

        // Tournament matchmaking: no open public tournament, so open one (4 players) with
        // this player as host; the next tournament searchers join it until it fills
        if (mode === 'tournament') {
            const room = this.roomManager.createRoom({ ...structuredClone(default_config.standardGame), mode: 'tournament', isPrivate: false, pointsToWin: 3, numPlayers: 4 });
            if (!this.roomManager.addPlayerToRoom(room.id, player.id)) {
                this.roomManager.removeRoom(room.id);
                return null;
            }
            const updated = this.roomManager.getPlayer(player.id);
            if (updated) {
                player.roomId = updated.roomId;
                player.position = updated.position;
            }
            return { room, queued: false };
        }

        const queue = this.standardQueue;

        if (queue.length > 0) {
            const waitingPlayer = queue.shift()!;

            const config = { ...default_config.standardGame, mode: 'standard' as const };
            const room = this.roomManager.createRoom(config);

            this.roomManager.addPlayerToRoom(room.id, waitingPlayer.id);
            this.roomManager.addPlayerToRoom(room.id, player.id);

            // Update both player objects with room info from storage
            const updatedWaitingPlayer = this.roomManager.getPlayer(waitingPlayer.id);
            if (updatedWaitingPlayer) {
                waitingPlayer.roomId = updatedWaitingPlayer.roomId;
                waitingPlayer.position = updatedWaitingPlayer.position;
            }
            const updatedPlayer = this.roomManager.getPlayer(player.id);
            if (updatedPlayer) {
                player.roomId = updatedPlayer.roomId;
                player.position = updatedPlayer.position;
            }

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

        // A started tournament keeps its own status (TournamentService); anything else reopens
        if (room.mode !== 'tournament' || !room.tournament || room.tournament.phase === 'registration') room.status = 'waiting';
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