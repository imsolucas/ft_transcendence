import type { RoomManager } from "../game/roomManager.js";

export default class TickSystem {
    private lastTime = performance.now();
    private readonly TICK_RATE = 60;
    private readonly TICK_INTERVAL = 1000 / this.TICK_RATE;
    private tickInterval: NodeJS.Timeout | null = null;

    constructor(private roomManager: RoomManager) {}

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
            console.log(room)
            if (!(room.gameServer?.tick(deltaTime)))
                room.status = 'finished';
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