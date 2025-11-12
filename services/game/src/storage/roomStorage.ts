import { randomUUID } from 'crypto';
import type { Room, RoomStorage } from '../types/room.types.js';

export class InMemoryRoomStorage implements RoomStorage {
	private rooms = new Map<string, Room>();

	createRoom(type: 'standard' | 'tournament' = 'standard'): Room {
		const roomId = randomUUID().substring(0, 8).toLowerCase();

		const newRoom: Room = {
			id: roomId,
			type: type,
			playerIds: [], // Empty array
			queueIds: [], // Empty queue for tournament mode
			status: 'waiting',
			createdAt: Date.now()
		};

		// Store the room in our Map
		this.rooms.set(roomId, newRoom);

		return newRoom;
	}

	getRoom(roomId: string): Room | undefined {
		return(this.rooms.get(roomId));
	}

	removeRoom(roomId: string): Room | undefined {
		const room = this.rooms.get(roomId);
		this.rooms.delete(roomId);
		return room;
	}

	getAllRooms(): Room[] {
		const allRooms: Room[] = [];
		for (const room of this.rooms.values()) {
			allRooms.push(room);
		}
		return allRooms;
	}

	getAvailableRooms(): Room[] {
		const availableRooms: Room[] = [];
		for (const room of this.rooms.values()) {
			let maxPlayers = room.type === 'standard' ? 2 : 8;
			// A room is available if it has less than maxPlayers and is waiting
			if (room.playerIds.length < maxPlayers && room.status === 'waiting') {
				availableRooms.push(room);
			}
		}
		return availableRooms;
	}

	getActiveRooms(): Room[] {
		const activeRooms: Room[] = [];
		for (const room of this.rooms.values()) {
			if (room.playerIds.length == 2 && room.status === 'playing') {
				activeRooms.push(room);
			}
		}
		return activeRooms;
	}
}