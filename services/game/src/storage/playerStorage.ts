import {
	type Player,
	type PlayerStorage
} from '../../../shared/types/player.types.js';

export class InMemoryPlayerStorage implements PlayerStorage {
	private players = new Map<string, Player>();

	add(player: Player): void {
		this.players.set(player.id, player);
	}

	remove(playerId: string): Player | undefined {
		const player = this.players.get(playerId);
		this.players.delete(playerId);
		return player;
	}

	get(playerId: string): Player | undefined {
		return this.players.get(playerId);
	}

	getPaxInRoom(roomId: string): number {
		let count = 0;
		for (const player of this.players.values()) {
			if (player.roomId === roomId) count++;
		}
		return count;
	}

	getPlayersInRoom(roomId: string): Player[] {
		const players: Player[] = [];
		for (const player of this.players.values()) {
			if (player.roomId === roomId) players.push(player);
		}
		return players;
	}
}
