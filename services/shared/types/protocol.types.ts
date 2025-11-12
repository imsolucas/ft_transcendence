import type { Player, serializablePlayer } from "./player.types.js";
import type { PlayerInputs } from "./pong.types.js";

export type GameMessage =
| ConnectionMessage
| ConnectionSuccessMessage
| ConnectionErrorMessage
| PlayerReadyMessage
| JoinQueueMessage
| LeaveRoomMessage
| PlayerInputMessage
| TournamentStateMessage;

export interface BaseMessage {
	type: string;
	timestamp: number;
	data: any;
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
		playerName?: string;
		playerId?: string;
		ready: boolean;
	};
}

export interface JoinQueueMessage extends BaseMessage {
	type: 'joinQueue';
	data: {
		roomId?: string;
		roomType: 'standard' | 'tournament';
	}
}

export interface LeaveRoomMessage extends BaseMessage {
	type: 'leaveRoom';
}

export interface PlayerInputMessage extends BaseMessage {
	type: 'playerInput';
	data: {
		inputs: PlayerInputs
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
		players: Array<{
			playerId: string;
			playerName: string;
			position?: number;
		}>;
	}
}

export interface TournamentStateMessage extends BaseMessage {
	type: 'tournamentState';
	data: {
		roomType: 'standard' | 'tournament';
		kingId?: string;
		kingName?: string;
		challengerId?: string;
		challengerName?: string;
		queue: Array<{
			playerId: string;
			playerName: string;
		}>;
	}
}

