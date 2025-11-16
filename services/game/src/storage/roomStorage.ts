import { randomUUID } from 'crypto';
import type { Room, RoomStorage } from '../types/room.types.js';
import type { GameConfig } from 'shared/index.js';

export class InMemoryRoomStorage implements RoomStorage {
	private privateRooms = new Map<string, Room>();
	private publicRooms = new Map<string, Room>();
	private rooms = new Map<string, Room>();

	createRoom(config: GameConfig): Room {
		const roomId = randomUUID().substring(0, 8).toLowerCase();

		const newRoom: Room = {
			id: roomId,
			type: config.mode,
			playerIds: [], // Empty array
			status: 'waiting',
			config: config,
			createdAt: Date.now()
		};

		// Store the room in our Map
		if (newRoom.config.isPrivate)
			this.privateRooms.set(roomId, newRoom);
		else
			this.publicRooms.set(roomId, newRoom);
		this.rooms.set(roomId, newRoom);

		console.log(`Created ${newRoom.config.isPrivate ? 'private' : 'public'} ${newRoom.type} room with id ${newRoom.id}`)
		return newRoom;
	}

	getRoom(roomId: string): Room | undefined {
		return(this.rooms.get(roomId));
	}

	getPrivateRoom(roomId: string): Room | undefined {
		return (this.privateRooms.get(roomId));
	}

	getPublicRoom(roomId: string): Room | undefined {
		return (this.publicRooms.get(roomId));
	}

	removeRoom(roomId: string): Room | undefined {
		const room = this.rooms.get(roomId);
		this.rooms.delete(roomId);
		this.privateRooms.delete(roomId);
		this.publicRooms.delete(roomId);
		console.log(`Deleted room with id ${roomId}`)
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
		for (const room of this.publicRooms.values()) {
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
			if (room.status === 'playing') {
				activeRooms.push(room);
			}
		}
		return activeRooms;
	}

	getPaxInRoom(roomId: string): number {
		const room = this.getRoom(roomId);
		let count = 0;
		for (const player of room!.playerIds) {
			count++;
		}
		return count;
	}
}