export interface Room {
	id: string;
	playerIds: string[];
	status: 'waiting' | 'full' | 'playing' | 'finished';
	createdAt: number;
}

export interface RoomStorage {
	createRoom(): Room;
	getRoom(roomId: string): Room | undefined;
	removeRoom(roomId: string): Room | undefined;
	getAllRooms(): Room[];
	getAvailableRooms(): Room[];
	getActiveRooms(): Room[];
}
