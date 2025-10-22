import type { Player, PlayerStorage } from '../types/player.types.js';

export class RoomManager {
  constructor(private playerStorage: PlayerStorage) {}

  getPlayerPosition(roomID: string): number {
    const playersCount = this.playerStorage.getPaxInRoom(roomID);

    if (playersCount === 0) return 1;
    if (playersCount === 1) return 2;

    // room is full
    return -1;
  }

  isRoomFull(roomID: string): boolean {
    return this.playerStorage.getPaxInRoom(roomID) >= 2;
  }

  addPlayerToRoom(player: Player): boolean {
    if (this.isRoomFull(player.roomID)) {
      return false;
    }

    this.playerStorage.add(player);
    return true;
  }

  removePlayerFromRoom(playerID: string): Player | undefined {
    return this.playerStorage.remove(playerID);
  }
}