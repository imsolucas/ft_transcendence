import type { PlayerStorage } from '../types/player.types.js';

export class MessageBroadcaster {
  constructor(private playerStorage: PlayerStorage) {}

  broadcastToRoom(roomID: string, message: any, excludePlayerID?: string): void {
    const playersInRoom = this.playerStorage.getPlayersInRoom(roomID);

    for (const player of playersInRoom) {
      // skip the excluded player if specified
      if (excludePlayerID && player.id === excludePlayerID) {
        continue;
      }

      // send message to this player's socket
      player.socket.send(JSON.stringify(message));
    }

    console.log(`Broadcasted to ${playersInRoom.length} players in room ${roomID}`);
  }
}