import { toSerializablePlayer, type GameEndMessage, type TournamentRoundEndMessage } from "shared/index.js";
import type { RoomManager } from "../game/roomManager.js";
import type { MessageBroadcaster } from "./Broadcaster.js";
import type TournamentService from "./TournamentService.js";

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
                const winnerId = room.gameServer.getWinner();

                if (room.mode === 'tournament' && winnerId) {
                    const tournamentResult = this.tournamentService.endRound(room, winnerId);

                    if (tournamentResult.tournamentOver) {
                        console.log(`Tournament finished! Winner: ${tournamentResult.tournamentWinnerId}`);
                        room.status = 'finished';
                        //frontend has to read the tourney state to come up with winnner screen
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
                    // standard game
                    room.status = 'finished';

                    const gameEndMsg: GameEndMessage = {
                        type: 'gameEnd',
                        data: {
                            winner: toSerializablePlayer(this.roomManager.getPlayer(winnerId!)!)
                        },
                        timestamp: Date.now()
                    }

                    this.broadcaster.broadcastToRoom(room.id, gameEndMsg);
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