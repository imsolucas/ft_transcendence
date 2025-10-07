import { GameState, type GameContext, type StateResult } from "./states/GameState";

type StateConstructor = new (context: GameContext, stateName: string) => GameState;

export class StateManager {
		private context: GameContext;																// Shared context for all states
		private currentState: GameState | null = null;							// Currently active state
		private states: Map<string, StateConstructor> = new Map();	// Registry of available states

		constructor(context: GameContext) {
			this.context = context;
		}

		registerState(stateName: string, StateClass: StateConstructor): void {
				// Check if already registered
				if (this.states.has(stateName)) {
						console.warn(`State '${stateName}' is already registered. Overwriting.`);
				}
				this.states.set(stateName, StateClass);
				console.log(`Registered state: ${stateName}`);
		}

		transitionTo(stateName: string): void {
				const StateClass = this.states.get(stateName);
				if (!StateClass) {
						console.error(`State '${stateName}' not registered`);
						return; // Exit early if state doesn't exist
				}
				try {
						if (this.currentState) {
								this.currentState.exit();
						}
						const newState = new StateClass(this.context, stateName);
						newState.enter();
						this.currentState = newState;
						console.log(`Transitioned to state: ${stateName}`);
				} catch (error) {
					console.error(`Failed to transition to state '${stateName}':`, error);
					this.currentState = null; // Reset current state on failure
				}
		}

		update(deltaTime: number): void {
			if (!this.currentState) {
				return;
			}
			const result = this.currentState.update(deltaTime);

			if (result?.nextState) {
				this.transitionTo(result.nextState);
			}
			if (result?.shouldExit) {
				this.currentState.exit();
				this.currentState = null;
				console.log("Exited current state");
			}
		}

		render(ctx: CanvasRenderingContext2D): void {
			if (this.currentState) {
				this.currentState.render(ctx);
			}
		}

		handleInput(event: KeyboardEvent, keyDown: boolean): void {
			if (this.currentState) {
				this.currentState.handleInput(event, keyDown);
			}
		}
}