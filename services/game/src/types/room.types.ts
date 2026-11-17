import type { GameConfig } from "shared/index.ts";
import { GameServer } from "../game/GameServer.ts";

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

export interface Room {
	id: string;
	mode: 'standard' | 'tournament'
	playerIds: string[]; //indexes 0 and 1 will be considered as player 1 and 2 respectively
	kingId?: string;
	challengerId?: string;
	queueIds?: string[]; // Queue of players waiting to challenge
	tournamentScores?: Map<string, number>;
	tournamentMatches?: TournamentMatch[]; // Track all matches in a tournament
	status: 'waiting' | 'full' | 'playing' | 'finished';
	createdAt: number;
	config: GameConfig;
	gameServer?: GameServer
}
