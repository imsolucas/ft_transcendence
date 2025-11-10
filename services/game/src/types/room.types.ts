import { GameServer } from "../game/GameServer.js";

export interface Room {
	id: string;
	type: 'standard' | 'tournament'
	playerIds: string[]; //indexes 0 and 1 will be considered as player 1 and 2 respectively
	kingId?: string;
	status: 'waiting' | 'full' | 'playing' | 'finished';
	createdAt: number;
	gameServer?: GameServer
}

export interface RoomStorage {
	createRoom(type?: 'standard' | 'tournament'): Room;
	getRoom(roomId: string): Room | undefined;
	removeRoom(roomId: string): Room | undefined;
	getAllRooms(): Room[];
	getAvailableRooms(): Room[];
	getActiveRooms(): Room[];
}
