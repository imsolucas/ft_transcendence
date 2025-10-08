import { GameState, type GameContext, type StateResult, type State } from "./GameState";

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
    }
    
    update(deltaTime: number): StateResult | null {
        if (this.#paused)
            return (null)
        else
            return ({nextState: this.getPreviousState()!})
    }

    handleInput(event: KeyboardEvent, keyDown: boolean): void {
        if (event.key == "Escape")
            this.#paused = false
    }
}