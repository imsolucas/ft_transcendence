import type { GameConfig } from "shared/index";

export interface GameOptionsData {
	type: 'local' | 'join-room' | 'random' | 'create-room';
  mode: 'tournament' | 'standard';
	config?: GameConfig;
	roomId?: string
}

export const gameStorage = {
  setGameOptions(data: GameOptionsData): void {
    sessionStorage.setItem('gameOptions', JSON.stringify(data));
  },

  getGameOptions(): GameOptionsData | null {
    const data = sessionStorage.getItem('gameOptions');
    return data ? JSON.parse(data) : null;
  },

  clearGameOptions(): void {
    sessionStorage.removeItem('gameOptions');
  }
};