import {
	type Player,
	type PlayerStorage
} from '../types/player.types.js';

export class InMemoryPlayerStorage implements PlayerStorage {
	private players = new Map<string, Player>();

	add(player: Player): void {
		this.players.set(player.id, player);
	}

	remove(playerID: string): Player | undefined {
		const player = this.players.get(playerID);
		this.players.delete(playerID);
		return player;
	}

	get(playerID: string): Player | undefined {
		return this.players.get(playerID);
	}

	getPaxInRoom(roomID: string): number {
		let count = 0;
		for (const player of this.players.values()) {
			if (player.roomID === roomID) {
				count++;
			}
		}
		return count;
	}

	getPlayersInRoom(roomID: string): Player[] {
		const playersInRoom: Player[] = [];
		for (const player of this.players.values()) {
			if (player.roomID === roomID) {
				playersInRoom.push(player);
			}
		}
		return playersInRoom;
	}
}
