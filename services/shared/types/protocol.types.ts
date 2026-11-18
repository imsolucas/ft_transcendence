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
| ReadyTimeoutMessage
| SpectateMessage
| StopSpectatingMessage
| LiveMatchesRequestMessage
| LiveMatchesMessage
| SpectateStartedMessage
| SpectatorCountMessage
| StartTournamentMessage;

export type GameErrorCodes =
| 'ALREADY_IN_ROOM'
| 'JOIN_FAILED'
| 'ROOM_NOT_FOUND'
| 'ROOM_FULL'
| 'INVALID_REQUEST'
| 'UNAUTHORIZED'
| 'INTERNAL_ERROR'
| 'SPECTATE_NOT_FOUND'
| 'SPECTATE_OWN_MATCH';

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

/** server → room: one bracket match ended (played or forfeited); the bracket follows */
export interface TournamentRoundEndMessage extends BaseMessage {
	type: 'tournamentRoundEnd';
	data: {
		matchId: string;
		winner: { id: string; name: string };
	};
}

/** server → room: the final is decided (winner null only if every player left) */
export interface TournamentEndMessage extends BaseMessage {
	type: 'tournamentEnd';
	data: {
		winner: { id: string; name: string } | null;
	}
}

/**
 * server → room (and watchers): the full bracket. Sent on every change: join, leave, start,
 * ready, match start, result, walkover, end. The server is the only authority over it.
 */
export interface TournamentStateMessage extends BaseMessage {
	type: 'tournamentState';
	data: {
		state: TournamentState;
	}
}

/** client → server: the host closes registration and seeds the bracket (≥ 3 players) */
export interface StartTournamentMessage extends BaseMessage {
	type: 'startTournament';
	data: Record<string, never>;
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

// ---------------------------------------------------------------- Spectator mode
// Spectators join a Socket.IO room "watch:<roomId>" that mirrors every room broadcast
// (state, start, end, lifecycle). They are never in room.playerIds, so they can't send input.

/** One live, public match (private rooms are never listed or watchable). */
export interface LiveMatch {
	roomId: string;
	mode: 'standard' | 'tournament';
	players: { id: string; name: string }[];
	scores: number[];
	spectators: number;
}

/** client → server: watch a room, or the match a player is in */
export interface SpectateMessage extends BaseMessage {
	type: 'spectate';
	data: { roomId?: string; userId?: number };
}

/** client → server */
export interface StopSpectatingMessage extends BaseMessage {
	type: 'stopSpectating';
	data: Record<string, never>;
}

/** client → server: ask for the live public matches */
export interface LiveMatchesRequestMessage extends BaseMessage {
	type: 'liveMatches';
	data: Record<string, never>;
}

/** server → client */
export interface LiveMatchesMessage extends BaseMessage {
	type: 'liveMatchesList';
	data: { matches: LiveMatch[] };
}

/** server → spectator: what you are watching, with the current state */
export interface SpectateStartedMessage extends BaseMessage {
	type: 'spectateStarted';
	data: { match: LiveMatch; config: GameConfig; gameState: GameState | null };
}

/** server → players and spectators of a room */
export interface SpectatorCountMessage extends BaseMessage {
	type: 'spectatorCount';
	data: { roomId: string; count: number };
}
