import { randomUUID } from 'node:crypto';
import { gameEnded } from '../presence.js';
import { toSerializablePlayer, type GameEndMessage, type TournamentEndMessage, type TournamentRoundEndMessage } from "shared/index.js";
import type { RoomManager } from "../game/roomManager.js";
import type { MessageBroadcaster } from "./Broadcaster.js";
import type TournamentService from "./TournamentService.js";
import { reportMatchResult, reportTournamentResult } from "../utils/reportResults.js";

export default class TickSystem {
    private lastTime = performance.now();
    private readonly TICK_RATE = 60;
    private readonly TICK_INTERVAL = (1000 / this.TICK_RATE);
    private tickInterval: NodeJS.Timeout | null = null;

    // Delays for tournament transitions (in milliseconds)
    private readonly DELAY_AFTER_ROUND_END = 2000; // 2 seconds to see winner
    private readonly DELAY_AFTER_STATE_UPDATE = 2000; // 2 seconds to see role changes

    constructor(private roomManager: RoomManager, private tournamentService: TournamentService, private broadcaster: MessageBroadcaster) {}

    startTickSystem(): void {
        if (this.tickInterval) clearInterval(this.tickInterval);

        // Run as fast as possible, but process fixed timesteps
        this.tickInterval = setInterval(() => {
            const currentTime = performance.now();
            let deltaTime = (currentTime - this.lastTime) / 1000;

            this.lastTime = currentTime;

            this.tick(deltaTime)
        }, this.TICK_INTERVAL);
    }

    private tick(deltaTime: number): void {
        const activeRooms = this.roomManager.getActiveRooms();

        // console.log("activeRooms:", activeRooms);
        for (const room of activeRooms) {
            if (!room.gameServer) continue;

            const continueGame = room.gameServer.tick(deltaTime);

            if (!continueGame) {
                const roundWinner = room.gameServer.getWinner();

                const winnerId = room.mode == "tournament"
                    ? (roundWinner == 0 ? room.kingId! : room.challengerId!)
                    : (roundWinner == 0 ? room.playerIds[0] : room.playerIds[1]);
                if (room.mode === 'tournament' && winnerId) {
                    // Track this match before ending the round
                    const gameState = room.gameServer.getGameState();
                    const scores = gameState.scores || [0, 0];
                    const king = this.roomManager.getPlayer(room.kingId!);
                    const challenger = this.roomManager.getPlayer(room.challengerId!);
                    
                    if (king && challenger) {
                        const matchRecord = {
                            player1Id: king.id,
                            player2Id: challenger.id,
                            player1DisplayName: king.name,
                            player2DisplayName: challenger.name,
                            player1Score: scores[0],
                            player2Score: scores[1],
                            winnerId: winnerId,
                            played_at: new Date(Date.now() - 60000).toISOString(), // Approximate match start
                            end_at: new Date().toISOString()
                        };
                        
                        if (!room.tournamentMatches) room.tournamentMatches = [];
                        room.tournamentMatches.push(matchRecord);
                    }

                    const tournamentResult = this.tournamentService.endRound(room, winnerId);

                    if (tournamentResult.tournamentOver) {
                        console.log(`Tournament finished! Winner: ${tournamentResult.tournamentWinnerId}`);
                        room.status = 'finished';

                        const tournamentEndMsg: TournamentEndMessage = {
                            type: 'tournamentEnd',
                            data: { winner: toSerializablePlayer(this.roomManager.getPlayer(winnerId)!)! },
                            timestamp: Date.now()
                        }

                        this.broadcaster.broadcastToRoom(room.id, tournamentEndMsg);
                        gameEnded(room.playerIds);
                        //frontend has to read the tourney state to come up with winnner screen

                        // Report tournament result to users service
                        const tournamentData = {
                            tournamentKey: randomUUID(), // idempotency key; the users DB assigns the tournament id
                            name: `Tournament ${room.id}`,
                            winnerId: tournamentResult.tournamentWinnerId ? parseInt(tournamentResult.tournamentWinnerId) : undefined,
                            start_at: new Date(room.createdAt).toISOString(),
                            end_at: new Date().toISOString(),
                            players: room.playerIds.map(id => ({ userId: parseInt(id) })),
                            matches: (room.tournamentMatches || []).map(m => ({
                                player1Id: parseInt(m.player1Id),
                                player2Id: parseInt(m.player2Id),
                                player1DisplayName: m.player1DisplayName,
                                player2DisplayName: m.player2DisplayName,
                                player1Score: m.player1Score,
                                player2Score: m.player2Score,
                                winnerId: parseInt(m.winnerId),
                                played_at: m.played_at,
                                end_at: m.end_at
                            }))
                        };
                        reportTournamentResult(tournamentData);
                    } else {
                        console.log(`Round ended. Preparing for next round...`);

                        // Pause the game during transitions
                        room.status = 'waiting';

                        // Step 1: Send round end message
                        const roundEndMsg: TournamentRoundEndMessage = {
                            type: 'tournamentRoundEnd',
                            data: {winner: toSerializablePlayer(this.roomManager.getPlayer(winnerId)!)},
                            timestamp: Date.now()
                        }
                        this.broadcaster.broadcastToRoom(room.id, roundEndMsg);

                        // Step 2: After delay, send tournament state update
                        setTimeout(() => {
                            this.tournamentService.broadcastTournamentState(room.id);

                            // Step 3: After another delay, reset game and resume
                            setTimeout(() => {
                                if (room.gameServer) {
                                    room.gameServer.resetGame();
                                    room.status = 'playing';
                                    console.log(`Next round started in room ${room.id}`);
                                }
                            }, this.DELAY_AFTER_STATE_UPDATE);
                        }, this.DELAY_AFTER_ROUND_END);
                    }
                } else {
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
                    const player1 = this.roomManager.getPlayer(room.playerIds[0]);
                    const player2 = this.roomManager.getPlayer(room.playerIds[1]);

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
                        reportMatchResult(matchResult);
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
