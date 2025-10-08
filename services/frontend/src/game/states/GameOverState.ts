import { drawString } from "../utils/drawUtils";
import { GameState, type GameContext, type StateResult } from "./GameState";

// State for when either player wins by reaching the required point limit, player should be promted to play again or go to menu (when that is implemented)
export default class GameOverState extends GameState {
    #playAgain = false
    #menu = false

    constructor(context: GameContext) {
        super (context, "GameOverState")
    }

    enter(): void {
        
    }

    exit(): void {
        for (let i in this.getPlayerScore())
            this.getPlayerScore()[i] = 0;
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.getEntityManager().drawEntities(ctx);
        this.drawCurrentUi();
        drawString("PRESS SPACE TO PLAY AGAIN", {x: this.getCanvas().width / 2, y: this.getCanvas().height / 2}, "GREY", "100px 'Courier New', monospace", ctx);
    }

    update(deltaTime: number): StateResult | null {
        if (this.#playAgain)
            return ({nextState: "PlayingState"})
        return (null)
    }

    handleInput(event: KeyboardEvent, keyDown: boolean): void {
        if (event.key == " " && !keyDown)
            this.#playAgain = true;
    }
}