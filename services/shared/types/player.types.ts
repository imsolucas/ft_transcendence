import { omitKeys } from "../utils/type.utils.ts";
import type { PlayerLook } from "../cosmetics/look.ts";

export interface Player {
	id: string;
	name: string;
	roomId: string;
	position: number;
	connectedAt: number;
	isReady: boolean;
	socket: WebSocket;
	picture: string;
	/** pixel avatar, frame and paddle skin, from the users service at connect */
	look?: PlayerLook;
	/** current-season ranked rating at connect (updated after each ranked match); for matchmaking */
	rating?: number;
	/** ranked games counted for `rating` (to ignore a late, older update) */
	ratedGames?: number;
}


// Create interface for player that is compatible with JSON.serialize
export const NON_SERIALIZABLE_PLAYER_KEYS = ['socket'] as const
export type serializablePlayer = Omit<Player, typeof NON_SERIALIZABLE_PLAYER_KEYS[number]>

export function toSerializablePlayer(player: Player): serializablePlayer {
    return omitKeys(player, NON_SERIALIZABLE_PLAYER_KEYS);
}


export interface PlayerStorage {

	//basic operations
	add(player: Player): void;
	remove(playerId: string): Player | undefined;
	get(playerId: string): Player | undefined;
}
