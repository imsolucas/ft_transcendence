import type EntityManager from "../EntityManager.js";

// Shared context passed to each state
export interface GameContext {
		entityManager: EntityManager;
		playerScore: number[];
		previousState?: StateName // The state previous to the current one
}

export type StateName = "PausedState" | "PlayingState" | "ScoredState" | "GameOverState" | "GameStartState"

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

		// contract methods all states must implement
		abstract enter(): void;
		abstract exit(): void;

		// core game loop methods to be implemented by each state
		abstract update(deltaTime: number): StateResult | null;
		abstract handleInput(event: KeyboardEvent, keyDown: boolean): void;

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