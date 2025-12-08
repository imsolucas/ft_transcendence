import type { PlayerInputs } from "../../types/pong.types.js";
import { BaseGameState, type GameContext, type StateResult } from "./BaseGameState.js";

// State for when the game starts, awaits input from the player to start the game (should probably be a nicer menu in the future)
export default class GameStartState extends BaseGameState{
    #waitedTime = 0
    #TimeToWait = 2

    constructor(context: GameContext) {
        super(context, "GameStartState")
    }

    enter(): void {
        this.getEntityManager().getPaddles()[0].setPos({
            x: this.context.config.paddleConfig.size!.x,
            y: this.context.config.courtSize!.y / 2
        })
        this.getEntityManager().getPaddles()[1].setPos({
            x: this.context.config.courtSize!.x - this.context.config.paddleConfig.size!.x,
            y: this.context.config.courtSize!.y / 2
        })
        for (let i in this.getPlayerScore())
            this.getPlayerScore()[i] = 0;
        this.getEntityManager().getBall().reset()
        this.getEntityManager().getBall().setVelocity({x: this.context.config.ballConfig.speed, y: 0});
    }

    update(deltaTime: number): StateResult | null {
        this.#waitedTime += deltaTime;

        if (this.#waitedTime >= this.#TimeToWait)
            return ({nextState: "PlayingState"});
        return (null)
    }
}