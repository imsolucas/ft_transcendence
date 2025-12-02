import {
	type Player,
	type PlayerStorage
} from 'shared';

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
}
