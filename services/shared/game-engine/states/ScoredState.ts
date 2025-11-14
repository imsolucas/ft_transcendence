import type { PlayerInputs } from "../../types/pong.types.js";
import Paddle from "../entities/Paddle.js";
import { BaseGameState, type GameContext, type StateResult } from "./BaseGameState.js";

// State for when any of the players scores a point, 
export default class ScoredState extends BaseGameState {
    #waitedTime = 0
    #TimeToWait = 2

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
        this.#waitedTime += deltaTime
        this.getEntityManager().tickEntities(deltaTime, Paddle);

        for (let i in this.getPlayerScore()){
            if (this.getPlayerScore()[i] >= this.context.config.pointsToWin)
                return ({nextState: "GameOverState"})
        }

        if (this.#waitedTime >= this.#TimeToWait) {
            return({nextState: "PlayingState"})
        }
        return (null);
    }

    handleInput(p1?: PlayerInputs, p2?: PlayerInputs): void {
        this.getEntityManager().playerInputs(p1, p2);
    }
}