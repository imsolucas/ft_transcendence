export interface Player {
	id: string;
	name: string;
	socket: WebSocket;
	roomID: string;
	position: number;
	connectedAt: number;
}

export interface PlayerStorage {

	//basic operations
	add(player: Player): void;
	remove(playerId: string): Player | undefined;
	get(playerId: string): Player | undefined;

	//useful queries for multiplayer
	getPaxInRoom(roomId: string): number;
	getPlayersInRoom(roomID: string): Player[];
}