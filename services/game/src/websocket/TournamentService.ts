import { RoomManager } from "../game/roomManager.js"
import type { Room } from "../types/room.types.js";

export default class TournamentService {
    constructor (
        private roomManager: RoomManager
    )
    {}

    assignRoles(room: Room) {
        if (room.mode !== 'tournament') return;

        const playerIds = room.playerIds;

        // First player becomes king and second becomes challenger
        if (playerIds.length >= 2 && playerIds[0] && playerIds[1]) {
            room.kingId = playerIds[0];
            room.challengerId = playerIds[1];
        }

        // Remaining players go to queue
        room.queueIds = playerIds.slice(2) || [];
    }

    endRound(room: Room, winnerId: string) {
        if (!room || room.mode !== 'tournament') return;

        // Determine if winner is king or challenger
        const kingWon = winnerId === room.kingId;

        if (kingWon) {
        // King wins: challenger goes to back of queue
        if (room.challengerId) {
            console.log(`king won, challenger ${room.challengerId} goes to back of queue`);
            if (!room.queueIds) room.queueIds = [];
            room.queueIds.push(room.challengerId);
        }

        // Next player in queue becomes new challenger
        if (room.queueIds && room.queueIds.length > 0) {
            const nextId = room.queueIds.shift();
            if (nextId) {
            room.challengerId = nextId;
            console.log(`New challenger: ${room.challengerId}`);
            }
        } else {
            delete room.challengerId;
        }
        } else {
        // Challenger wins: becomes new king, old king goes to back of queue
        console.log(`challenger won, old king ${room.kingId} goes to back of queue`);

        if (room.kingId) {
            if (!room.queueIds) room.queueIds = [];
            room.queueIds.push(room.kingId);
        }

        // Challenger becomes new king
        if (room.challengerId) {
            room.kingId = room.challengerId;
            console.log(`New king: ${room.kingId}`);

            // Reset new king ready state
            const newKing = this.roomManager.getPlayer(room.challengerId);
        }

        // Next player in queue becomes new challenger
        if (room.queueIds && room.queueIds.length > 0) {
            const nextId = room.queueIds.shift();
            if (nextId) {
            room.challengerId = nextId;
            console.log(`New challenger: ${room.challengerId}`);
            }
        } else {
            delete room.challengerId;
        }
        }
    }
}