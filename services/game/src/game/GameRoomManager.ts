import type { Room } from 'shared';
import { GameRoom } from './GameRoom.js';

export class GameRoomManager {
  private gameRooms = new Map<string, GameRoom>();

  getOrCreate(room: Room): GameRoom {
    let gameRoom = this.gameRooms.get(room.id);
    if (!gameRoom) {
      gameRoom = new GameRoom(room);
      this.gameRooms.set(room.id, gameRoom);
    }
    return gameRoom;
  }

  remove(roomId: string): void {
    this.gameRooms.delete(roomId);
  }

  getActiveGameRooms(rooms: Room[]): GameRoom[] {
    return rooms.map(room => this.getOrCreate(room));
  }
}
