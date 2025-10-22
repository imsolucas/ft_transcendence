import type { Player, PlayerStorage } from '../types/player.types.js';

export class RoomManager {
  constructor(private playerStorage: PlayerStorage) {}

  getPlayerPosition(roomID: string): number {
    const playersInRoom = this.playerStorage.getPlayersInRoom(roomID);

    // check which positions are taken
    let position1Taken = false;
    let position2Taken = false;

    for (const player of playersInRoom) {
      if (player.position === 1) {
        position1Taken = true;
      } else if (player.position === 2) {
        position2Taken = true;
      }
    }

    // return first available position
    if (!position1Taken) return 1;
    if (!position2Taken) return 2;

    // room is full
    return -1;
  }

  isRoomFull(roomID: string): boolean {
    return this.getPlayerPosition(roomID) === -1;
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