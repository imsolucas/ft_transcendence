import { drawString } from "../utils/drawUtils";
import { GameState, type GameContext, type StateResult } from "./GameState";

// State that pauses the game
export default class PausedState extends GameState {
    #paused = true;

    constructor(context: GameContext) {
        super (context, "PausedState")
    }

    enter(): void {
        
    }

    exit(): void {
        
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        this.getEntityManager().drawEntities(ctx);
        this.drawCurrentUi();
        drawString("PAUSED", {x: this.getCanvas().width / 2, y: this.getCanvas().height / 2}, "GREY", "100px 'Courier New', monospace", ctx);
    }

    update(deltaTime: number): StateResult | null {
        if (this.#paused)
            return (null)
        else
            return ({nextState: this.getPreviousState()!, shouldEnter: false})
    }

    handleInput(event: KeyboardEvent, keyDown: boolean): void {
        if (event.key == "Escape" && !keyDown)
            this.#paused = false;
    }
}