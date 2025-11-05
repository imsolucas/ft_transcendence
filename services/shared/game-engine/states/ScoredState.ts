import { constants } from "../constants.js";
import { BaseGameState, type GameContext, type StateResult } from "./BaseGameState.js";

// State for when any of the players scores a point, 
export default class ScoredState extends BaseGameState {
    #waitFrames: number = 0;

    constructor(context: GameContext) {
        super(context, "ScoredState")
    }

    enter(): void {
        if (this.getEntityManager().getBall().getPos().x <= 0)
            this.context.playerScore[1]++;
        else
            this.context.playerScore[0]++;
        this.getEntityManager().getBall().reset();
    }

    update(deltaTime: number): StateResult | null {
        for (let i in this.getPlayerScore()){
            if (this.getPlayerScore()[i] >= constants.WIN_POINT)
                return ({nextState: "GameOverState"})
        }

        if (this.#waitFrames != 60){
            this.#waitFrames++;
            return (null)
        }
        else {
            return({nextState: "PlayingState"})
        }
            
    }
}