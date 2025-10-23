import type { RoomManager } from '../game/roomManager.js';

export class MessageBroadcaster {
  constructor(private roomManager: RoomManager) {}

  broadcastToRoom(roomId: string, message: any, excludePlayerid?: string): void {
    const playersInRoom = this.roomManager.getPlayersInRoom(roomId);

    for (const player of playersInRoom) {
      // skip the excluded player if specified
      if (excludePlayerid && player.id === excludePlayerid) {
        continue;
      }

      // send message to this player's socket
      player.socket.send(JSON.stringify(message));
    }

    console.log(`Broadcasted to ${playersInRoom.length} players in room ${roomId}`);
  }
}