import type { GameConfig, TournamentPhase, TournamentPlayer } from "shared/index.ts";
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

export interface Room {
	id: string;
	mode: 'standard' | 'tournament'
	playerIds: string[]; //indexes 0 and 1 will be considered as player 1 and 2 respectively
	tournament?: TournamentRuntime;
	status: 'waiting' | 'full' | 'playing' | 'finished';
	/** Paused while a player reconnects (the tick loop skips it) */
	paused?: boolean;
	createdAt: number;
	config: GameConfig;
	gameServer?: GameServer
}
