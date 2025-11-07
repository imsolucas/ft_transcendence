
import type { PlayerInputMessage, PlayerInputs } from 'shared';
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

    const ball = this.gameEngine.getBall()
    const paddles = this.gameEngine.getPaddles()
    const context = this.gameEngine.getContext()
    const gameState = {
      ball: {
        x: ball.getPos().x,
        y: ball.getPos().y,
        vx: ball.getVelocity().x,
        vy: ball.getVelocity().y,
        width: ball.getHibox()!.width,
        height: ball.getHibox()!.height
      },
      paddles: [
        {x: paddles[0]!.getPos().x, y: paddles[0]!.getPos().y},
        {x: paddles[1]!.getPos().x, y: paddles[1]!.getPos().y}
      ],
      scores: context.playerScore,
      isPlaying: true,
      lastUpdate: Date.now()
    }
  
    console.log(`Tick for room ${this.id}`);
    this.broadcaster.broadcastToRoom(this.id, {
      type: "gameState",
      data: gameState,
      timeStamp: Date.now()
    });
    // Example: if game ends, update status
    // if (gameOverCondition) {
    //   this.roomManager.setRoomStatus(this.id, 'finished');
    // }
  }
}
