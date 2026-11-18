
import type { Player, PlayerStorage, GameConfig } from 'shared';
import type { Room } from '../types/room.types.ts';
import type { GameServer } from './GameServer.ts';
import { randomUUID } from 'crypto';

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
      mode: config.mode,
      playerIds: [],
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

  /** 1v1 rooms hold two; a party room four; a tournament room its chosen size (4, 6 or 8). */
  capacity(room: Room): number {
    if (room.mode === 'party') return 4;
    return room.mode === 'standard' ? 2 : Math.min(8, room.config.numPlayers ?? 8);
  }

  /** A tournament only takes players during registration (it is closed once the bracket is drawn). */
  private acceptsPlayers(room: Room): boolean {
    // a party takes players only in its lobby (a 3-player party in play has a free seat)
    if (room.mode === 'party') return room.status === 'waiting' || room.status === 'full';
    return room.mode !== 'tournament' || !room.tournament || room.tournament.phase === 'registration';
  }

  // Get available rooms (not full)
  getAvailableRooms(): Room[] {
    const availableRooms: Room[] = [];
    for (const room of this.rooms.values()) {
      // Private rooms (created to play a friend) are only joinable by code
      if (room.playerIds.length < this.capacity(room) && room.status === 'waiting' && !room.config.isPrivate && this.acceptsPlayers(room)) {
        availableRooms.push(room);
      }
    }
    return availableRooms;
  }

  // Get active rooms (playing)
  getActiveRooms(): Room[] {
    const activeRooms: Room[] = [];
    for (const room of this.rooms.values()) {
      if (room.status === 'playing') {
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
    if (!this.acceptsPlayers(room))
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
    console.log(`Player "${player.name}" joined ${room.config.isPrivate ? 'private' : 'public'} ${room.mode} room "${room.id}"`);
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

    if (room.playerIds.length === 0) {
      this.removeRoom(roomId);
    }
    console.log(`Removed Player ${playerId} from room ${roomId} `);
    return true;
  }

  // Get all players in a room
  getPlayersInRoom(roomId: string): Player[] {
    const room = this.getRoom(roomId);
    if (!room) return [];
    const playersInRoom: Player[] = []
  
    for (const id of room.playerIds)
      playersInRoom.push(this.playerStorage.get(id)!);
  
    return playersInRoom
  }

  // Get first available position in a room
  getPlayerPosition(roomId: string): number {
    const room = this.getRoom(roomId);
    if (!room) return -1;

    // tournament seats are given per bracket match (TournamentService), not on joining
    if (room.mode === 'tournament') return 0;
    const players = this.getPlayersInRoom(roomId);
    const maxPlayers = this.capacity(room);

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
    return room.playerIds.length >= this.capacity(room);
  }

  // Get number of players in a room
  getPaxInRoom(roomId: string): number {
    return this.getPlayersInRoom(roomId).length;
  }
}