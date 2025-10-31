
import type { RoomManager } from "./roomManager.js";
import type { Room } from 'shared';
import type { GameState } from 'shared';
import { MessageBroadcaster } from "../websocket/broadcaster.js";
import { timeStamp } from "console";

export class PongSession {
  readonly id: string;
  readonly playerIds: string[];
  readonly createdAt: number;
  gameState: GameState;
  private broadcaster: MessageBroadcaster;

  constructor(room: Room, initialGameState: GameState, broadcaster: MessageBroadcaster) {
    this.id = room.id;
    this.playerIds = room.playerIds;
    this.createdAt = room.createdAt;
    this.gameState = initialGameState;
    this.broadcaster = broadcaster;
  }

  // Called every tick by the tick system
  tick(): void {
    // 1. Process player inputs (if any)
    // 2. Update game state (move ball, check collisions, etc)
    // 3. Check for win/lose conditions
    // 4. Broadcast state to players (if needed)
    // For now, just log to show it's running:

    console.log(`Tick for room ${this.id}`);
    this.broadcaster.broadcastToRoom(this.id, {
      type: "gameState",
      data: this.gameState,
      timeStamp: Date.now()
    });
    // Example: if game ends, update status
    // if (gameOverCondition) {
    //   this.roomManager.setRoomStatus(this.id, 'finished');
    // }
  }
}
