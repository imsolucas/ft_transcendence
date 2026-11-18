import type { GameMessage } from 'shared/index.ts';
import type { RoomManager } from '../rooms/roomManager.ts';

export class MessageBroadcaster {
  /** Spectators: every room broadcast is mirrored to the room's watchers (set in index.ts). */
  private mirror?: (roomId: string, json: string) => void;

  constructor(private roomManager: RoomManager) {}

  setSpectatorMirror(fn: (roomId: string, json: string) => void) {
    this.mirror = fn;
  }

  broadcastToRoom(roomId: string, message: GameMessage, excludePlayerid?: string): void {
    this.mirror?.(roomId, JSON.stringify(message));
    const playersInRoom = this.roomManager.getPlayersInRoom(roomId);

    for (const player of playersInRoom) {
      // skip the excluded player if specified
      if (excludePlayerid && player.id === excludePlayerid) {
        continue;
      }

      // send message to this player's socket
      player.socket!.send(JSON.stringify(message));
    }

  }
}