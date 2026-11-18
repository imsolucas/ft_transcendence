import { BaseGameState, type GameContext, type StateResult } from "./BaseGameState.ts";
import type { PlayerInputs } from "../../types/pong.types.ts";

// This is the state where the pong gameplay happens, players can control the paddles and score
export default class PlayingState extends BaseGameState {
    constructor (context: GameContext) {
        super(context, "PlayingState")
    }

    update(deltaTime: number): StateResult | null {
        this.getEntityManager().tickEntities(deltaTime);
        this.getEntityManager().checkCollisions();
        this.context.powerUps?.update(deltaTime, this.getEntityManager());

        if (this.getEntityManager().getBall().isDestroyed())
        {
            return ({nextState: "ScoredState"})
        }
        return (null)
    }

    handleInput(p1: PlayerInputs, p2: PlayerInputs): void {
        this.getEntityManager().playerInputs(p1, p2)
    }
}