
import type { Player, PlayerStorage } from 'shared';
import type { Room, RoomStorage } from '../types/room.types.js';
import type { GameServer } from './GameServer.js';

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
  createRoom(type: 'standard' | 'tournament' = 'standard'): Room {
    return this.roomStorage.createRoom(type);
  }

  // Remove a room
  removeRoom(roomId: string): Room | undefined {
    const removed = this.roomStorage.removeRoom(roomId);
    return removed;
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

  // Get active rooms (playing)
  getActiveRooms(): Room[] {
    return this.roomStorage.getActiveRooms();
  }

  // Add a player to a room by playerId
  addPlayerToRoom(roomId: string, playerId: string): boolean {
    const room = this.roomStorage.getRoom(roomId);
    if (!room)
      return false;
    if (this.isRoomFull(roomId))
      return false;
    if (room.playerIds.includes(playerId))
      return false;

    // Fetch player and assign position/room
    const player = this.getPlayer(playerId);
    if (!player) return false;
    const position = this.getPlayerPosition(roomId);
    player.roomId = roomId;
    player.position = position;
    this.playerStorage.add(player);
    room.playerIds.push(playerId);
    if (this.isRoomFull(roomId)) {
      room.status = 'full';
    }
    console.log("Player added to room");
    return true;
  }

  // Remove a player from a room
  removePlayerFromRoom(roomId: string, playerId: string): boolean {
    const room = this.roomStorage.getRoom(roomId);
    if (!room)
      return false;
    const player = this.getPlayer(playerId);
    if (player) {
      player.roomId = "";
      player.position = 0;
    }

    const idx = room.playerIds.indexOf(playerId);
    if (idx === -1)
      return false;
    room.playerIds.splice(idx, 1);

    if (room.playerIds.length > 0) {
      room.status = 'waiting';
    }
    if (room.playerIds.length === 0) {
      this.removeRoom(roomId);
    }
    return true;
  }

  // Get all players in a room
  getPlayersInRoom(roomId: string): Player[] {
    return this.playerStorage.getPlayersInRoom(roomId);
  }

  // Get first available position in a room
  getPlayerPosition(roomId: string): number {
    const room = this.getRoom(roomId);
    if (!room) return -1;

    const players = this.getPlayersInRoom(roomId);
    const maxPlayers = room.type === 'standard' ? 2 : 8;

    // Find first available position (1-indexed)
    const takenPositions = new Set(players.map(p => p.position));
    for (let i = 1; i <= maxPlayers; i++) {
      if (!takenPositions.has(i)) {
        return i;
      }
    }
    return -1; // No available positions
  }

  // Check if room is full
  isRoomFull(roomId: string): boolean {
    const room = this.getRoom(roomId);
    if (!room)
      return false;
    if (room.type === 'standard')
      return room.playerIds.length >= 2;
    else
      return room.playerIds.length >= 8;
  }

  // Get number of players in a room
  getPaxInRoom(roomId: string): number {
    return this.playerStorage.getPaxInRoom(roomId);
  }
}