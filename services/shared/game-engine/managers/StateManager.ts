import type { PlayerInputs } from "../../types/pong.types.js";
import { BaseGameState, type GameContext, type StateName } from "../states/BaseGameState.js";

type StateConstructor = new (context: GameContext, stateName: string) => BaseGameState;

export class StateManager {
		private context: GameContext;																// Shared context for all states
		private currentState: BaseGameState | null = null;							// Currently active state
		private states: Map<StateName, StateConstructor> = new Map();	// Registry of available states

		constructor(context: GameContext) {
			this.context = context;
		}

		registerState(stateName: StateName, StateClass: StateConstructor): void {
				// Check if already registered
				if (this.states.has(stateName)) {
						console.warn(`State '${stateName}' is already registered. Overwriting.`);
				}
				this.states.set(stateName, StateClass);
				console.log(`Registered state: ${stateName}`);
		}

		transitionTo(stateName: StateName, shouldEnter: boolean = true): void {
				const StateClass = this.states.get(stateName);
				if (!StateClass) {
						console.error(`State '${stateName}' not registered`);
						return; // Exit early if state doesn't exist
				}
				try {
						if (this.currentState) {
								this.currentState.exit();
								this.context.previousState = this.currentState.getName();
						}
						const newState = new StateClass(this.context, stateName);
						if (shouldEnter)
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
				this.transitionTo(result.nextState, result.shouldEnter);
			}
			if (result?.shouldExit) {
				this.currentState.exit();
				this.currentState = null;
				console.log("Exited current state");
			}
		}

		handleInput(p1?: PlayerInputs, p2?: PlayerInputs): void {
			if (this.currentState) {
				this.currentState.handleInput(p1, p2);
			}
		}
}