import { constants } from "../definitions";
import { GameState, type GameContext, type StateResult } from "./GameState";

export default class ScoredState extends GameState {
    #waitFrames: number = 0;

    constructor(context: GameContext) {
        super(context, "ScoredState")
    }

    enter(): void {
        if (this.getEntityManager().getSquareBall().getPos().x <= 0)
            this.context.playerScore[1]++;
        else
            this.context.playerScore[0]++;
        this.getEntityManager().getSquareBall().reset(this.getCanvas());
    }

    exit(): void {
        
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
            return({nextState: "PlayingState", shouldEnter: false})
        }
            
    }

    handleInput(event: KeyboardEvent, keyDown: boolean): void {
        
    }

}