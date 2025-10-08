import type EntityManager from "../EntityManager";

// Shared context passed to each state
export interface GameContext {
		canvas: HTMLCanvasElement;
		ctx: CanvasRenderingContext2D;
		entityManager: EntityManager;
		previousState?: StateName
}

export type StateName = "PausedState" | "PlayingState" | "ScoredState"

// What states can "return" to communicate with StateManager
export interface StateResult {
		nextState?: StateName; // Name of the next state to transition to
		shouldExit?: boolean; // Whether the current state should exit
}

// Abstract base class for all game states
export abstract class GameState {
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
		abstract render(ctx: CanvasRenderingContext2D): void;
		abstract handleInput(event: KeyboardEvent, keyDown: boolean): void;

		// helper methods to access context
		protected getCanvas(): HTMLCanvasElement {
			return this.context.canvas;
		}

		protected getCtx(): CanvasRenderingContext2D {
			return this.context.ctx;
		}

		protected getEntityManager(): EntityManager {
			return this.context.entityManager;
		}

		protected getPreviousState(): StateName | null {
			if (this.context.previousState === undefined)
				return (null)
			else
				return (this.context.previousState)
		}

		getName(): StateName {
			return this.stateName;
		}
}