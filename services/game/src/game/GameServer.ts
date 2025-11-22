
import type { GameConfig, GameStartMessage, GameState, GameStateMessage, PlayerInputMessage, PlayerInputs } from 'shared';
import { GameEngine } from 'shared';
import type { Room } from '../types/room.types.js';
import { MessageBroadcaster } from "../websocket/Broadcaster.js";
import { RoomManager } from './roomManager.js';

export class GameServer {
  readonly id: string;
  readonly playerIds: string[];
  readonly createdAt: number;
  private gameEngine: GameEngine;
  private broadcaster: MessageBroadcaster;
  private config: GameConfig;

  constructor(room: Room, broadcaster: MessageBroadcaster) {
    this.id = room.id;
    this.playerIds = room.playerIds;
    this.createdAt = room.createdAt;
    this.broadcaster = broadcaster;
    this.config = room.config;
    this.gameEngine = new GameEngine(room.config);
  }

  input(p1?: PlayerInputs, p2?: PlayerInputs): void {
    this.gameEngine.input(p1, p2);
  }

  resetGame(): void {
    // Re-create the game engine with the same config
    this.gameEngine = new GameEngine(this.config);
  }

  // Called every tick by the tick system
  tick(deltaTime: number): boolean {
    // 1. Process player inputs (if any)
    // 2. Move game forwards by 1 frame
    // 3. Check for win/lose conditions
    // 4. Broadcast state to player

    this.gameEngine.tick(deltaTime)

    const gameState = this.gameEngine.getGameState()

    // console.log(`Tick for room ${this.id}`);

    const message: GameStateMessage = {
      type: "gameState",
      data: { gameState },
      timestamp: Date.now()
    }

    this.broadcaster.broadcastToRoom(this.id, message);

    return (gameState.name !== 'GameOverState');
  }

  getWinner(): string | null {
    const gameState = this.gameEngine.getGameState();

    if (gameState.name !== 'GameOverState' || !gameState.scores) {
      return null;
    }

    const scores = gameState.scores;
    const winnerIndex = (scores[0] ?? 0) > (scores[1] ?? 0) ? 0 : 1;
    return this.playerIds[winnerIndex] ?? null;
  }
}
