import { constants } from "../definitions";
import { drawString } from "../utils/drawUtils";
import { GameState, type GameContext, type StateResult } from "./GameState";

// State for when either player wins by reaching the required point limit, player should be promted to play again or go to menu (when that is implemented)
export default class GameOverState extends GameState {
    #playAgain = false
    #winningPlayer = -1
    #menu = false

    constructor(context: GameContext) {
        super (context, "GameOverState")
    }

    enter(): void {
        let i = 0; 
        while(this.getPlayerScore()[i] < constants.WIN_POINT) {
            i++;
        }
        this.#winningPlayer = i + 1;
        
    }

    exit(): void {
        for (let i in this.getPlayerScore())
            this.getPlayerScore()[i] = 0;
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.getEntityManager().drawEntities(ctx);
        this.drawCurrentUi();
            
        drawString(`PLAYER ${this.#winningPlayer} WINS\nPRESS SPACE TO PLAY AGAIN`, {x: constants.COURT_WIDTH / 2, y: constants.COURT_HEIGHT / 2}, "GREY", "10px 'Courier New', monospace", ctx);
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