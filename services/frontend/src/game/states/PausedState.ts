import { GameState, type GameContext, type StateResult } from "./GameState";

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
        this.drawCurrentUi()
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