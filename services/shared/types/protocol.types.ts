import type { Player, serializablePlayer } from "./player.types.ts";
import type { GameConfig, GameState, PlayerInputs, TournamentState } from "./pong.types.ts";

export type GameMessage =
| ConnectionMessage
| ConnectionSuccessMessage
| ConnectionErrorMessage
| PlayerReadyMessage
| PlayerLeftMessage
| JoinQueueMessage
| JoinRoomMessage
| CreateRoomMessage
| LeaveRoomMessage
| LeaveQueueMessage
| GameStateMessage
| PlayerInputMessage
| GameStartMessage
| GameEndMessage
| TournamentRoundEndMessage
| TournamentEndMessage
| PlayerJoinedMessage
| TournamentStateMessage;

export type GameErrorCodes =
| 'ALREADY_IN_ROOM'
| 'JOIN_FAILED'
| 'ROOM_NOT_FOUND'
| 'ROOM_FULL'
| 'INVALID_REQUEST'
| 'UNAUTHORIZED'
| 'INTERNAL_ERROR';

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
		playerId: string;
		picture: string;
		token?: string;
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
		config?: GameConfig;
		roomType: 'standard' | 'tournament';
	}
}

export interface LeaveRoomMessage extends BaseMessage {
	type: 'leaveRoom';
	data: {
		playerName: string;
	}
}

export interface LeaveQueueMessage extends BaseMessage {
	type: 'leaveQueue';
	data: {
		playerName: string;
	}
}

export interface PlayerInputMessage extends BaseMessage {
	type: 'playerInput';
	data: {
		inputs: PlayerInputs
	}
}

export interface CreateRoomMessage extends BaseMessage {
	type: 'createRoom';
	data: {
		config: GameConfig;
	}
}

export interface JoinRoomMessage extends BaseMessage {
	type: 'joinRoom';
	data: {
		roomId: string;
	}
}

export interface ErrorMessage extends BaseMessage {
	type: 'Error';
	data: {
		message: string;
		code: GameErrorCodes;
	}
}

// from server

export interface ConnectionSuccessMessage extends BaseMessage {
	type: 'connectionSuccess';
}

export interface ConnectionErrorMessage extends BaseMessage {
	type: 'connectionError';
	data: {
		message: string;
		code?: string;
	};
}

export interface QueueJoinedMessage extends BaseMessage {
	type: 'queueJoined';
	data: {
		position: number
		queueLength: number
	}
}

export interface PlayerJoinedMessage extends BaseMessage {
	type: 'playerJoined';
	data: {
		playerName: string
		playerId: string;
		roomId: string;
		position: number;
		picture: string;
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
		players: {
			playerId: string;
			playerName: string;
			position?: number;
		}[];
		tournamentState?: TournamentState
	}
}

export interface GameEndMessage extends BaseMessage {
	type: 'gameEnd';
	data: {
		winner: serializablePlayer
	};
}

export interface TournamentRoundEndMessage extends BaseMessage {
	type: 'tournamentRoundEnd';
	data: {
		winner: serializablePlayer
	};
}

export interface TournamentEndMessage extends BaseMessage {
	type: 'tournamentEnd';
	data: {
		winner: serializablePlayer
	}
}

export interface TournamentStateMessage extends BaseMessage {
	type: 'tournamentState';
	data: {
		state: TournamentState;
	}
}

export interface GameStateMessage extends BaseMessage {
	type: 'gameState';
	data: {
		gameState: GameState
	}
}

