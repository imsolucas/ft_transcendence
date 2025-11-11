
import type { GameStartMessage, GameState, GameStateMessage, PlayerInputMessage, PlayerInputs } from 'shared';
import { GameEngine } from 'shared';
import type { Room } from '../types/room.types.js';
import { MessageBroadcaster } from "../websocket/broadcaster.js";

export class GameServer {
  readonly id: string;
  readonly playerIds: string[];
  readonly createdAt: number;
  private lastTickTime: number = 0;
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
  tick(): boolean {
    // 1. Process player inputs (if any)
    // 2. Move game forwards by 1 frame
    // 3. Check for win/lose conditions
    // 4. Broadcast state to player
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTickTime) / 1000;
    this.lastTickTime = currentTime

    this.gameEngine.tick(deltaTime)
    
    const gameState = this.gameEngine.getGameState()

    console.log(`Tick for room ${this.id}`);

    const message: GameStateMessage = {
      type: "gameState",
      data: { gameState },
      timestamp: Date.now()
    }

    this.broadcaster.broadcastToRoom(this.id, message);

    return (gameState.name !== 'GameOverState');
  }
}
