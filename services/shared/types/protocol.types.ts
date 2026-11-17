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
| TournamentStateMessage
| ForfeitMessage
| RematchMessage
| OpponentReconnectingMessage
| OpponentReconnectedMessage
| RejoinedMessage
| RematchRequestedMessage
| RematchReadyMessage
| ReadyTimeoutMessage;

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
		playerId: string;
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



// ---------------------------------------------------------------- Phase 3: match lifecycle

/** client → server: give up the current match (recorded as a loss) */
export interface ForfeitMessage extends BaseMessage {
	type: 'forfeit';
	data: Record<string, never>;
}

/** client → server: ask for a rematch after a 1v1 ends (both must ask) */
export interface RematchMessage extends BaseMessage {
	type: 'rematch';
	data: Record<string, never>;
}

/** server → room: a player dropped mid-match; the match is paused until `deadline` (ms epoch) */
export interface OpponentReconnectingMessage extends BaseMessage {
	type: 'opponentReconnecting';
	data: { playerId: string; playerName: string; deadline: number };
}

/** server → room: the dropped player is back; the match resumes */
export interface OpponentReconnectedMessage extends BaseMessage {
	type: 'opponentReconnected';
	data: { playerId: string };
}

/** server → returning player: you were put back into your match */
export interface RejoinedMessage extends BaseMessage {
	type: 'rejoined';
	data: { roomId: string; playersInRoom: serializablePlayer[]; gameState: GameState | null };
}

/** server → room: one player wants a rematch */
export interface RematchRequestedMessage extends BaseMessage {
	type: 'rematchRequested';
	data: { playerId: string; playerName: string };
}

/** server → room: both agreed; back to the ready check */
export interface RematchReadyMessage extends BaseMessage {
	type: 'rematchReady';
	data: { roomId: string; playersInRoom: serializablePlayer[] };
}

/** server → room: not everyone readied up in time; the room is closed */
export interface ReadyTimeoutMessage extends BaseMessage {
	type: 'readyTimeout';
	data: { roomId: string };
}
