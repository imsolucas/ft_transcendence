import { constants } from "../constants.js";
import { drawString } from "../utils/drawUtils.js";
import { BaseGameState, type GameContext, type StateResult } from "./BaseGameState.js";

// State that pauses the game
export default class PausedState extends BaseGameState {
    #paused = true;

    constructor(context: GameContext) {
        super (context, "PausedState")
    }

    enter(): void {
        
    }

    exit(): void {
        
    }
    
    update(deltaTime: number): StateResult | null {
        if (this.#paused)
            return (null)
        else
            return ({nextState: this.getPreviousState()!, shouldEnter: false})
    }

    handleInput(event: KeyboardEvent, keyDown: boolean): void {
        if (event.key == "Escape" && !keyDown)
            this.#paused = false;
    }
}