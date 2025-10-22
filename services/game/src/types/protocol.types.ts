export type GameMessage =
| ConnectionMessage
| ConnectionSuccessMessage
| ConnectionErrorMessage;

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