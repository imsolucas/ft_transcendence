import { GameState, type GameContext, type StateResult } from "./GameState";
import { constants, type PlayerInputs } from "../definitions";

// This is the state where the pong gameplay happens, players can control the paddles and score
export default class PlayingState extends GameState {
    #playerInputs: PlayerInputs[] = []
    #paused = false;

    constructor (context: GameContext) {
        super(context, "PlayingState")
        this.#playerInputs.push({up: false, down: false, left: false, right: false})
        this.#playerInputs.push({up: false, down: false, left: false, right: false})
    }

    enter(): void {
        
    }

    exit(): void {
        
    }

    update(deltaTime: number): StateResult | null {
        this.getEntityManager().tickEntities(deltaTime, this.getCanvas());
        this.getEntityManager().checkCollisions();
        this.getEntityManager().playerInputs(this.#playerInputs);

        if (this.#paused)
            return ({nextState: "PausedState"})
        if (this.getEntityManager().getSquareBall().isDestroyed())
        {
            return ({nextState: "ScoredState"})
        }
        return (null)
    }

    handleInput(event: KeyboardEvent, keyDown: boolean): void {

        if (event.key == "Escape" && !keyDown)
            this.#paused = true;
        switch(event.key){
            case ("w"):
                this.#playerInputs[0].up = keyDown;
                break;
            case("s"):
                this.#playerInputs[0].down = keyDown;
                break;
            case("ArrowDown"):
                this.#playerInputs[1].down = keyDown;
                break;
            case("ArrowUp"):
                this.#playerInputs[1].up = keyDown;
                break;
        }

    }

}