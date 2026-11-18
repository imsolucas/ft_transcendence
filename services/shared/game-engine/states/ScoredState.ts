import type { PlayerInputs } from "../../types/pong.types.ts";
import Paddle from "../entities/Paddle.ts";
import { BaseGameState, type GameContext, type StateResult } from "./BaseGameState.ts";

// State for when any of the players scores a point, 
export default class ScoredState extends BaseGameState {
    #waitedTime = 0
    #TimeToWait = 2

    constructor(context: GameContext) {
        super(context, "ScoredState")
    }

    enter(): void {
        const ball = this.getEntityManager().getBall();
        let newVelx = this.context.config.ballConfig.speed;

        if (ball.getPos().x <= 0) {
            this.context.playerScore[1] = (this.context.playerScore[1] ?? 0) + 1;
            newVelx *= 1;
        }
        else {
            newVelx *= -1;
            this.context.playerScore[0] = (this.context.playerScore[0] ?? 0) + 1;
        }
        
        ball.reset()
        ball.setVelocity({x: newVelx, y: 0});
        this.context.powerUps?.reset(this.getEntityManager());
    }

    update(deltaTime: number): StateResult | null {
        this.#waitedTime += deltaTime
        this.getEntityManager().tickEntities(deltaTime, Paddle);

        for (let i in this.getPlayerScore()){
            if ((this.getPlayerScore()[i] ?? 0) >= this.context.config.pointsToWin)
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