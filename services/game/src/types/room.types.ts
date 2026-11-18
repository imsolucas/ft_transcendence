import type { GameConfig, PartyEngine, PartyPlayer, TournamentPhase, TournamentPlayer } from "shared/index.ts";
import { GameServer } from "../game/GameServer.ts";
import type { Bracket } from "../tournament/bracket.ts";

/** A bracket match that was actually played (or forfeited mid-game), for the report. */
export interface TournamentMatch {
	player1Id: string;
	player2Id: string;
	player1DisplayName: string;
	player2DisplayName: string;
	player1Score: number;
	player2Score: number;
	winnerId: string;
	played_at: string;
	end_at: string;
}

/** Server-side tournament of one room. Identities are snapshotted: leavers stay listed. */
export interface TournamentRuntime {
	/** idempotency key for the report */
	key: string;
	hostId: string;
	/** registration capacity */
	size: number;
	players: TournamentPlayer[];
	/** null until the host starts (or the room fills) */
	bracket: Bracket | null;
	phase: TournamentPhase;
	currentMatchId: string | null;
	readyIds: Set<string>;
	readyDeadline: number | null;
	matchStartedAt: number;
	startedAt: number;
	records: TournamentMatch[];
	championId: string | null;
	/** the one pending transition (ready deadline or the pause between matches) */
	timer: ReturnType<typeof setTimeout> | null;
}

/** Server-side party (3–4 players) of one room. Seats are snapshotted at the start. */
export interface PartyRuntime {
	/** idempotency key for the report */
	key: string;
	engine: PartyEngine;
	/** seat i = seats[i]; a leaver keeps their seat (it becomes a wall) */
	seats: PartyPlayer[];
	startedAt: number;
	finished: boolean;
}

export interface Room {
	id: string;
	mode: 'standard' | 'tournament' | 'party'
	playerIds: string[]; //indexes 0 and 1 will be considered as player 1 and 2 respectively
	tournament?: TournamentRuntime;
	party?: PartyRuntime;
	status: 'waiting' | 'full' | 'playing' | 'finished';
	/** Paused while a player reconnects (the tick loop skips it) */
	paused?: boolean;
	createdAt: number;
	config: GameConfig;
	gameServer?: GameServer
	/** made by the matchmaking queue: the result counts for the season's ratings */
	ranked?: boolean;
}
