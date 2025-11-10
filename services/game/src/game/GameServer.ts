
import type { GameStartMessage, GameState, GameStateMessage, PlayerInputMessage, PlayerInputs } from 'shared';
import { GameEngine } from 'shared';
import type { Room } from '../types/room.types.js';
import { MessageBroadcaster } from "../websocket/broadcaster.js";

export class GameServer {
  readonly id: string;
  readonly playerIds: string[];
  readonly createdAt: number;
  private gameEngine = new GameEngine()
  private broadcaster: MessageBroadcaster;

  constructor(room: Room, broadcaster: MessageBroadcaster) {
    this.id = room.id;
    this.playerIds = room.playerIds;
    this.createdAt = room.createdAt;
    this.broadcaster = broadcaster;
  }

  input(p1?: PlayerInputs, p2?: PlayerInputs): void {
    this.gameEngine.input(p1, p2);
  }

  // Called every tick by the tick system
  tick(): void {
    // 1. Process player inputs (if any)
    // 2. Update game state (move ball, check collisions, etc)
    // 3. Check for win/lose conditions
    // 4. Broadcast state to players (if needed)
    // For now, just log to show it's running:

    this.gameEngine.tick(1)
    
    const gameState = this.gameEngine.getGameState()

    console.log(`Tick for room ${this.id}`);

    const message: GameStateMessage = {
      type: "gameState",
      data: { gameState },
      timestamp: Date.now()
    }

    this.broadcaster.broadcastToRoom(this.id, message);
    // Example: if game ends, update status
    // if (gameOverCondition) {
    //   this.roomManager.setRoomStatus(this.id, 'finished');
    // }
  }
}
