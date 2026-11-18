import { gameEnded } from '../presence.ts';
import { applyRatings } from "./ranked.ts";
import { toSerializablePlayer, type GameEndMessage } from "shared/index.ts";
import type { RoomManager } from "../rooms/roomManager.ts";
import type { MessageBroadcaster } from "./Broadcaster.ts";
import type TournamentService from "./TournamentService.ts";
import type PartyService from "./PartyService.ts";
import { reportMatchResult } from "../users-api/results.ts";

export default class TickSystem {
    private lastTime = performance.now();
    private readonly TICK_RATE = 60;
    private readonly TICK_INTERVAL = (1000 / this.TICK_RATE);
    private tickInterval: NodeJS.Timeout | null = null;

    constructor(private roomManager: RoomManager, private tournamentService: TournamentService, private broadcaster: MessageBroadcaster, private partyService: PartyService) {}

    startTickSystem(): void {
        if (this.tickInterval) clearInterval(this.tickInterval);

        // Run as fast as possible, but process fixed timesteps
        this.tickInterval = setInterval(() => {
            const currentTime = performance.now();
            let deltaTime = (currentTime - this.lastTime) / 1000;

            this.lastTime = currentTime;

            this.tick(deltaTime);
        }, this.TICK_INTERVAL);
    }

    private tick(deltaTime: number): void {
        const activeRooms = this.roomManager.getActiveRooms();

        // console.log("activeRooms:", activeRooms);
        for (const room of activeRooms) {
            if (room.mode === 'party') {
                // PartyService runs the engine, broadcasts and finishes the party
                if (!room.paused) this.partyService.tick(room, deltaTime);
                continue;
            }
            if (!room.gameServer || room.paused) continue;

            const continueGame = room.gameServer.tick(deltaTime);

            if (!continueGame) {
                const roundWinner = room.gameServer.getWinner();

                if (room.mode === 'tournament') {
                    // the bracket decides what comes next (TournamentService)
                    this.tournamentService.onGameOver(room, roundWinner === 0 ? 0 : 1);
                    continue;
                }
                const winnerId = roundWinner == 0 ? room.playerIds[0] : room.playerIds[1];
                {
                    room.status = 'finished';

                    const gameEndMsg: GameEndMessage = {
                        type: 'gameEnd',
                        data: {
                            winner: toSerializablePlayer(this.roomManager.getPlayer(winnerId!)!)
                        },
                        timestamp: Date.now()
                    }

                    this.broadcaster.broadcastToRoom(room.id, gameEndMsg);
                    gameEnded(room.playerIds);

                    // Report match result to users service
                    const gameState = room.gameServer.getGameState();
                    const scores = gameState.scores || [0, 0];
                    const player1 = room.playerIds[0] ? this.roomManager.getPlayer(room.playerIds[0]) : undefined;
                    const player2 = room.playerIds[1] ? this.roomManager.getPlayer(room.playerIds[1]) : undefined;

                    if (player1 && player2) {
                        const matchResult = {
                            player1Id: parseInt(player1.id),
                            player2Id: parseInt(player2.id),
                            player1DisplayName: player1.name,
                            player2DisplayName: player2.name,
                            player1Score: scores[0],
                            player2Score: scores[1],
                            winnerId: winnerId ? parseInt(winnerId) : null,
                            played_at: new Date(room.createdAt).toISOString(),
                            end_at: new Date().toISOString()
                        };
                        reportMatchResult({ ...matchResult, ranked: !!room.ranked }, (ratings) => applyRatings(this.roomManager, room.id, ratings));
                    }
                }
            }
        }
    }

    stopTickSystem(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        console.log("Stopped TickSystem");
    }
}
