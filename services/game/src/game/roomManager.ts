
import type { Player, PlayerStorage } from 'shared';
import type { Room } from '../types/room.types.js';
import type { GameServer } from './GameServer.js';
import { randomUUID } from 'crypto';
import { GameConfig } from 'shared';

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(
    private playerStorage: PlayerStorage
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
  createRoom(config: GameConfig): Room {
    const roomId = randomUUID().substring(0, 8).toLowerCase();

    const newRoom: Room = {
      id: roomId,
      type: config.mode,
      playerIds: [],
      queueIds: [],
      status: 'waiting',
      createdAt: Date.now(),
      config: config,
    };

    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  // Remove a room
  removeRoom(roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    this.rooms.delete(roomId);
    return room;
  }

  // Get a room by id
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  // getPrivateRoom(roomId: string): Room | undefined {
  //   return this.rooms.getPrivateRoom(roomId);
  // }

  // Get all rooms
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // Get available rooms (not full)
  getAvailableRooms(): Room[] {
    const availableRooms: Room[] = [];
    for (const room of this.rooms.values()) {
      const maxPlayers = (room.type === 'standard') ? 2 : 6;
      if (room.playerIds.length < maxPlayers && room.status === 'waiting') {
        availableRooms.push(room);
      }
    }
    return availableRooms;
  }

  // Get active rooms (playing)
  getActiveRooms(): Room[] {
    const activeRooms: Room[] = [];
    for (const room of this.rooms.values()) {
      if (room.playerIds.length === 2 && room.status === 'playing') {
        activeRooms.push(room);
      }
    }
    return activeRooms;
  }

  // Add a player to a room by playerId
  addPlayerToRoom(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
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
    // console.log(`Player "${player.name}" joined ${room.config.isPrivate ? 'private' : 'public'} ${room.type} room "${room.id}"`);
    console.log(`Player "${player.name}" joined ${room.type} room "${room.id}"`);

    return true;
  }

  // Remove a player from a room
  removePlayerFromRoom(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
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
    console.log(`Removed Player ${playerId} from room ${roomId} `);
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
    const maxPlayers = room.type === 'standard' ? 2 : 6;

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