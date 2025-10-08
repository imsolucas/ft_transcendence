import { GameState, type GameContext, type StateResult } from "./GameState";

export default class ScoredState extends GameState {
    #waitFrames: number = 0;

    constructor(context: GameContext) {
        super(context, "ScoredState")
    }

    enter(): void {

    }

    exit(): void {
        
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.getEntityManager().drawEntities(ctx);
    }

    update(deltaTime: number): StateResult | null {
        if (this.#waitFrames != 60){
            this.#waitFrames++;
            return (null)
        }
        else {
            return({nextState: "PlayingState"})
        }
            
    }

    handleInput(event: KeyboardEvent, keyDown: boolean): void {
        
    }

}