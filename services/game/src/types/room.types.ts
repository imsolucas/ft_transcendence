import type { GameConfig } from "shared/index.js";
import { GameServer } from "../game/GameServer.js";

export interface Room {
	id: string;
	type: 'standard' | 'tournament'
	playerIds: string[]; //indexes 0 and 1 will be considered as player 1 and 2 respectively
	kingId?: string;
	challengerId?: string;
	queueIds?: string[]; // Queue of players waiting to challenge
	status: 'waiting' | 'full' | 'playing' | 'finished';
	createdAt: number;
	config: GameConfig;
	gameServer?: GameServer
}

export interface RoomStorage {
	createRoom(config: GameConfig): Room;
	getRoom(roomId: string): Room | undefined;
	removeRoom(roomId: string): Room | undefined;
	getAllRooms(): Room[];
	getAvailableRooms(): Room[];
	getPublicRoom(roomId: string): Room | undefined;
	getPrivateRoom(roomId: string): Room | undefined;
	getActiveRooms(): Room[];
}
