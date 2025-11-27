import { RoomManager } from "../game/roomManager.js"
import type { Room } from "../types/room.types.js";
import { MessageBroadcaster } from "./Broadcaster.js";
import type { TournamentState, TournamentStateMessage } from "shared/index.js";

export default class TournamentService {
    constructor (
        private roomManager: RoomManager,
        private broadcaster: MessageBroadcaster
    )
    {}

    assignRoles(room: Room) {
        if (room.mode !== 'tournament') return;

        const playerIds = room.playerIds;

        // Initialize tournament scores for all players
        if (!room.tournamentScores) {
            room.tournamentScores = new Map<string, number>();
            playerIds.forEach(id => room.tournamentScores!.set(id, 0));
        }

        // First player becomes king and second becomes challenger
        if (playerIds.length >= 2 && playerIds[0] && playerIds[1]) {
            room.kingId = playerIds[0];
            room.challengerId = playerIds[1];
        }

        // Remaining players go to queue
        room.queueIds = playerIds.slice(2) || [];
    }

    private popNextChallenger(room: Room): void {
        if (room.queueIds && room.queueIds.length > 0) {
            const nextId = room.queueIds.shift();
            if (nextId) {
                room.challengerId = nextId;
            }
        } else {
            delete room.challengerId;
        }
    }

    endRound(room: Room, winnerId: string): { tournamentOver: boolean; tournamentWinnerId?: string } {
        if (!room || room.mode !== 'tournament') return { tournamentOver: false };

        if (!room.tournamentScores) {
            room.tournamentScores = new Map<string, number>();
        }

        const currentScore = room.tournamentScores.get(winnerId) || 0;
        room.tournamentScores.set(winnerId, currentScore + 1);


        // when score is 5, tourney over
        if (currentScore + 1 >= 5) {
            console.log(`Tournament over! Winner: ${winnerId}`);
            room.status = 'finished';
            return { tournamentOver: true, tournamentWinnerId: winnerId };
        }

        // Determine if winner is king or challenger
        const kingWon = winnerId === room.kingId;

        if (kingWon) {
            // King wins: challenger goes to back of queue
            if (room.challengerId) {
                if (!room.queueIds) room.queueIds = [];
                room.queueIds.push(room.challengerId);
            }
            this.popNextChallenger(room);
        } else {
            // Challenger wins: becomes new king, old king goes to back of queue
            if (room.kingId) {
                if (!room.queueIds) room.queueIds = [];
                room.queueIds.push(room.kingId);
            }

            // Challenger becomes new king
            if (room.challengerId) {
                room.kingId = room.challengerId;
            }
            this.popNextChallenger(room);
        }

        return { tournamentOver: false };
    }

    getRoomTournamentState(roomId: string): TournamentState | null{
        const room = this.roomManager.getRoom(roomId);
        if (!room || room.mode !== 'tournament') return null;

        const king = room.kingId ? this.roomManager.getPlayer(room.kingId) : undefined;
        const challenger = room.challengerId ? this.roomManager.getPlayer(room.challengerId) : undefined;
        const queuePlayers = (room.queueIds || []).map(id => this.roomManager.getPlayer(id));

        const tournamentState: TournamentState = {
                kingId: king ? king.id : '',
                kingName: king ? king.name : '',
                challengerId: challenger ? challenger.id : '',
                challengerName: challenger ? challenger.name : '',
                queue: queuePlayers.map(p => ({
                    playerId: p!.id,
                    playerName: p!.name
                    }))
            };

        return tournamentState
    }

    broadcastTournamentState(roomId: string): void {
        const tournamentState = this.getRoomTournamentState(roomId);

        if (!tournamentState) return ;

        const tournamentStateMessage: TournamentStateMessage = {
            type: 'tournamentState',
            data: {
                state: tournamentState!
            },
            timestamp: Date.now()
        }

        this.broadcaster.broadcastToRoom(roomId, tournamentStateMessage);
    }
}