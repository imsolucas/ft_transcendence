export interface Player {
	id: string;
	name: string;
	socket: WebSocket;
	roomID: string;
	connectedAt: number;
}

export interface PlayerStorage {

	//basic operations
	add(player: Player): void;
	remove(playerId: string): Player | undefined;
	get(playerId: string): Player | undefined;

	//useful queries for multiplayer
	getInRoom(roomId: string): number;
}