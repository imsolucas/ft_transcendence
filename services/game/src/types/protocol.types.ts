import { extname } from "path";

export type GameMessage =
| ConnectionMessage
| ConnectionSuccessMessage
| ConnectionErrorMessage
| PlayerReadyMessage;

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
		playerID: string;
		roomID: string;
		position: number; // p1 or p2
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
		playerID: string;
		ready: boolean;
	};
}

export interface PlayerJoinedMessage extends BaseMessage {
	type: 'playerJoined';
	data: {
		playerName: string;
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
		player1Id: string;
		player2Name: string;
		player2Id: string;
	}
}