import type { RoomManager } from "../game/roomManager.js";
import type TournamentService from "./TournamentService.js";

export default class TickSystem {
    private lastTime = performance.now();
    private readonly TICK_RATE = 60;
    private readonly TICK_INTERVAL = (1000 / this.TICK_RATE);
    private tickInterval: NodeJS.Timeout | null = null;

    constructor(private roomManager: RoomManager, private tournamentService: TournamentService) {}

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
                        console.log(`Round ended. Resetting game for next round...`);
                        room.gameServer.resetGame();
                        room.status = 'playing';
                        this.tournamentService.broadcastTournamentState(room.id);
                    }
                } else {
                    // standard game
                    room.status = 'finished';
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