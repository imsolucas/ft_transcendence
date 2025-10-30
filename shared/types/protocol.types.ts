import { Player, serializablePlayer } from "./player.types";

export type GameMessage =
| ConnectionMessage
| ConnectionSuccessMessage
| ConnectionErrorMessage
| PlayerReadyMessage
| JoinQueueMessage
| LeaveRoomMessage;

export type GameServerMessage = 
| 'connectionSuccess'
| 'connectionError'
| 'playerJoined'
| 'playerLeft'
| 'gameStart'

export type GameClientMessage = 
| 'connection'
| 'playerReady'
| 'joinQueue'
| 'leaveRoom'

export type GameMessageType = GameClientMessage | GameServerMessage

export interface BaseMessage {
	type: string;
	timestamp: number;
}

// from client

export interface ConnectionMessage extends BaseMessage {
	type: 'connection';
	data: {
		playerName: string;
	} ;
}

export interface PlayerReadyMessage extends BaseMessage {
	type: 'playerReady';
	data: {
		playerName: string;
		playerId: string;
		ready: boolean;
	};
}

export interface JoinQueueMessage extends BaseMessage {
	type: 'joinQueue';
	data: {
		playerName:	 string;
		playerId: string;
		roomId?: string;
	}
}

export interface LeaveRoomMessage extends BaseMessage {
	type: 'leaveRoom';
	data: {
		playerID: string;
	}
}


// from server

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

export interface PlayerJoinedMessage extends BaseMessage {
	type: 'playerJoined';
	data: {
		playerName: string
		playerId: string;
		roomId: string;
		position: number;
		playersInRoom: serializablePlayer[]
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

