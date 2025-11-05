export interface Room {
	id: string;
	playerIds: string[]; //indexes 0 and 1 will be considered as player 1 and 2 respectively
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
