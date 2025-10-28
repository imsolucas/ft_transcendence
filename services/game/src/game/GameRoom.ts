import type { RoomManager } from "./roomManager.js";
import type { Room } from '../../../shared/types/room.types.js';

export class GameRoom {
  id: string;
  playerIds: string[];
  status: Room['status'];
  createdAt: number;

  constructor(room: Room) {
    this.id = room.id;
    this.playerIds = room.playerIds;
    this.status = room.status;
    this.createdAt = room.createdAt;
    // Add more game state as needed (ball, scores, etc)
  }

  // Called every tick by the tick system
  tick(): void {
    // 1. Process player inputs (if any)
    // 2. Update game state (move ball, check collisions, etc)
    // 3. Check for win/lose conditions
    // 4. Broadcast state to players (if needed)
    // For now, just log to show it's running:
    console.log(`Tick for room ${this.id}`);
  }
}
