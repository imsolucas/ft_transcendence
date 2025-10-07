import type EntityManager from "../EntityManager";

// Shared context passed to each state
export interface GameContext {
		canvas: HTMLCanvasElement;
		ctx: CanvasRenderingContext2D;
		entityManager: EntityManager;
		keys: {
			w: boolean;
			s: boolean;
			up: boolean;
			down: boolean;
		};
}

// What states can "return" to communicate with StateManager
export interface StateResult {
		nextState?: string; // Name of the next state to transition to
		shouldExit?: boolean; // Whether the current state should exit
}

// Abstract base class for all game states
export abstract class GameState {
		protected context: GameContext;
		protected stateName: string;

		constructor(context: GameContext, stateName: string) {
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

		protected getKeys(): GameContext["keys"] {
			return this.context.keys;
		}

		protected getEntityManager(): EntityManager {
			return this.context.entityManager;
		}

		getName(): string {
			return this.stateName;
		}
}