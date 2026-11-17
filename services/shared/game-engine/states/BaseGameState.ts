import type { GameConfig, PlayerInputs } from "../../types/pong.types.ts";
import type EntityManager from "../managers/EntityManager.ts";

// Shared context passed to each state
export interface GameContext {
		config: GameConfig;
		entityManager: EntityManager;
		playerScore: number[];
		previousState?: StateName // The state previous to the current one
}

export type StateName = "PausedState" | "PlayingState" | "ScoredState" | "GameOverState" | "GameStartState" | "ListenState"

// What states can "return" to communicate with StateManager
export interface StateResult {
		nextState?: StateName; // Name of the next state to transition to
		shouldEnter?: boolean; // Whether the enter() method of the next state should be called
		shouldExit?: boolean; // Whether the current state should exit
}

// Abstract base class for all game states
export abstract class BaseGameState {
		protected context: GameContext;
		protected stateName: StateName;

		constructor(context: GameContext, stateName: StateName) {
			this.context = context;
			this.stateName = stateName;
		}

		// Methods states can override if something needs to be done on enter
		enter(): void {}
		exit(): void {}

		// core game loop methods
		abstract update(deltaTime: number): StateResult | null;
		handleInput(p1?: PlayerInputs, p2?: PlayerInputs): void {}

		// helper methods to access context

		protected getEntityManager(): EntityManager {
			return this.context.entityManager;
		}

		protected getPreviousState(): StateName | null {
			if (this.context.previousState === undefined)
				return (null)
			else
				return (this.context.previousState)
		}

		protected getPlayerScore(): number[] {
			return this.context.playerScore;
		}

		getName(): StateName {
			return this.stateName;
		}
}