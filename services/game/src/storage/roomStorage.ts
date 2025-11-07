import { randomUUID } from 'crypto';
import type { Room, RoomStorage } from '../types/room.types.js';

export class InMemoryRoomStorage implements RoomStorage {
	private rooms = new Map<string, Room>();

	createRoom(): Room {
		const roomId = randomUUID().substring(0, 8).toLowerCase();

		const newRoom: Room = {
			id: roomId,
			playerIds: [], // Empty array - no players yet
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
			// A room is available if it has less than 2 players and is waiting
			if (room.playerIds.length < 2 && room.status === 'waiting') {
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