import type { PlayerInputs } from "../../types/pong.types.js";
import { BaseGameState, type GameContext, type StateResult } from "./BaseGameState.js";

// State for when either player wins by reaching the required point limit, player should be promted to play again or go to menu (when that is implemented)
export default class GameOverState extends BaseGameState {
    #playAgain = false
    #winningPlayer = -1
    #menu = false

    constructor(context: GameContext) {
        super (context, "GameOverState")
    }

    enter(): void {
        let i = 0; 
        while(this.getPlayerScore()[i] < this.context.config.pointsToWin) {
            i++;
        }
        this.#winningPlayer = i + 1;
        
    }

    exit(): void {
        for (let i in this.getPlayerScore())
            this.getPlayerScore()[i] = 0;
    }

    update(deltaTime: number): StateResult | null {
        if (this.#playAgain)
            return ({nextState: "PlayingState"})
        return (null)
    }

    handleInput(inputs: PlayerInputs): void {
        if (inputs.action_2)
            this.#menu = true;
        if (inputs.action_1)
            this.#playAgain = true;
    }
}