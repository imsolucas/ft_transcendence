export interface serializablePlayer {
	id: string;
	name: string;
	roomId: string;
	position: number;
	connectedAt: number;
	isReady: boolean;
}

export interface Player extends serializablePlayer {
	socket?: WebSocket;
}

// Create interface for player that is compatible with JSON.serialize
// export type serializablePlayer = Omit<Player, "socket">

export interface PlayerStorage {

	//basic operations
	add(player: Player): void;
	remove(playerId: string): Player | undefined;
	get(playerId: string): Player | undefined;

	//useful queries for multiplayer
	getPaxInRoom(roomId: string): number;
	getPlayersInRoom(roomId: string): Player[];
}
