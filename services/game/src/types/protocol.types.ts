import { extname } from "path";

export type GameMessage =
| ConnectionMessage
| ConnectionSuccessMessage
| ConnectionErrorMessage
| PlayerReadyMessage
| CreateRoomMessage
| JoinRoomMessage;

export interface BaseMessage {
	type: string;
	timestamp: number;
	id?: string;
}

export interface ConnectionMessage extends BaseMessage {
	type: 'connection';
	data: {
		playerName: string;
	} ;
}

export interface ConnectionSuccessMessage extends BaseMessage {
	type: 'connectionSuccess';
	data: {
		playerId: string;
	};
}

export interface ConnectionErrorMessage extends BaseMessage {
	type: 'connectionError';
	data: {
		message: string;
		code?: string;
	};
}

export interface PlayerReadyMessage extends BaseMessage {
	type: 'playerReady';
	data: {
		playerName: string;
		playerId: string;
		ready: boolean;
	};
}

export interface PlayerJoinedMessage extends BaseMessage {
	type: 'playerJoined';
	data: {
		playerId: string;
		roomId: string;
		position: number;
	}
}

export interface PlayerLeftMessage extends BaseMessage {
	type: 'playerLeft';
	data: {
		playerName: string;
	}
}

export interface GameStartMessage extends BaseMessage {
	type: 'gameStart';
	data: {
		player1Name: string;
		player1id: string;
		player2Name: string;
		player2id: string;
	}
}

export interface CreateRoomMessage extends BaseMessage {
	type: 'createRoom';
	data: {
		playerId: string;
		roomId: string;
	}
}

export interface JoinRoomMessage extends BaseMessage {
	type: 'joinRoom';
	data: {
		roomId: string;
		playerId: string;
	}
}
