import type { Player, PlayerStorage } from '../types/player.types.js';
import type { Room, RoomStorage } from '../types/room.types.js';

export class RoomManager {
  constructor(
    private playerStorage: PlayerStorage,
    private roomStorage: RoomStorage
  ) {}

  addPlayer(player: Player): void {
    return this.playerStorage.add(player);
  }

  removePlayer(playerId: string): Player | undefined {
    return this.playerStorage.remove(playerId);
  }

  getPlayer(playerId: string): Player | undefined {
    return this.playerStorage.get(playerId);
  }


  // Create a new room
  createRoom(): Room {
    return this.roomStorage.createRoom();
  }

  // Remove a room
  removeRoom(roomId: string): Room | undefined {
    return this.roomStorage.removeRoom(roomId);
  }

  // Get a room by id
  getRoom(roomId: string): Room | undefined {
    return this.roomStorage.getRoom(roomId);
  }

  // Get all rooms
  getAllRooms(): Room[] {
    return this.roomStorage.getAllRooms();
  }

  // Get available rooms (not full)
  getAvailableRooms(): Room[] {
    return this.roomStorage.getAvailableRooms();
  }

  // Add a player to a room
  addPlayerToRoom(roomId: string, player: Player): boolean {
    const room = this.roomStorage.getRoom(roomId);
    if (!room)
      return false;
    if (room.playerIds.length >= 2)
      return false;
    if (room.playerIds.includes(player.id))
      return false;

    // Assign position
    const position = this.getPlayerPosition(roomId);
    player.roomId = roomId;
    player.position = position;
    this.playerStorage.add(player);
    room.playerIds.push(player.id);
    if (room.playerIds.length === 2)
      room.status = 'full';
    console.log("Player added to room");
    return true;
  }

  // Remove a player from a room
  removePlayerFromRoom(roomId: string, playerId: string): boolean {
    const room = this.roomStorage.getRoom(roomId);
    if (!room)
      return false;

    const idx = room.playerIds.indexOf(playerId);
    if (idx === -1)
      return false;
    room.playerIds.splice(idx, 1);
    if (room.status === 'full')
      room.status = 'waiting';
    if (room.playerIds.length === 0)
      this.roomStorage.removeRoom(roomId);
    this.playerStorage.remove(playerId);
    return true;
  }

  // Get all players in a room
  getPlayersInRoom(roomId: string): Player[] {
    return this.playerStorage.getPlayersInRoom(roomId);
  }

  // Get first available position in a room
  getPlayerPosition(roomId: string): number {
    const players = this.getPlayersInRoom(roomId);
    let position1Taken = false;
    let position2Taken = false;
    for (const player of players) {
      if (player.position === 1) position1Taken = true;
      if (player.position === 2) position2Taken = true;
    }
    if (!position1Taken) return 1;
    if (!position2Taken) return 2;
    return -1;
  }

  // Check if room is full
  isRoomFull(roomId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room)
      return false;
    return room.playerIds.length >= 2;
  }

  // Get number of players in a room
  getPaxInRoom(roomId: string): number {
    return this.playerStorage.getPaxInRoom(roomId);
  }
}