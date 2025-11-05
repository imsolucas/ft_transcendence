import { drawString } from "../utils/drawUtils.js";
import { constants } from "../constants.js";
import { BaseGameState, type GameContext, type StateResult } from "./BaseGameState.js";

// State for when the game starts, awaits input from the player to start the game (should probably be a nicer menu in the future)
export default class GameStartState extends BaseGameState{
    #start = false;

    constructor(context: GameContext) {
        super(context, "GameStartState")
    }

    enter(): void {
        this.getEntityManager().getPaddles()[0].setPos({
            x: constants.PLAYER_WIDTH,
            y: constants.COURT_HEIGHT / 2
        })
        this.getEntityManager().getPaddles()[1].setPos({
            x: constants.COURT_WIDTH - constants.PLAYER_WIDTH,
            y: constants.COURT_HEIGHT / 2
        })
        for (let i in this.getPlayerScore())
            this.getPlayerScore()[i] = 0;
        this.getEntityManager().getBall().reset()
        this.getEntityManager().getBall().randomVelocity();
    }

    exit(): void {
        
    }

    update(deltaTime: number): StateResult | null {
        if (this.#start)
            return ({nextState: "PlayingState"});
        return (null)
    }

    handleInput(event: KeyboardEvent, keyDown: boolean): void {
        if (event.key == " " && !keyDown)
            this.#start = true;
    }
}