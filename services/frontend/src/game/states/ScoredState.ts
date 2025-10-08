import { GameState, type GameContext, type StateResult } from "./GameState";

export default class ScoredState extends GameState {
    #waitFrames: number = 0;

    constructor(context: GameContext) {
        super(context, "ScoredState")
    }

    enter(): void {
        if (!this.getEntityManager().getSquareBall().getPos())
            this.context.playerScore[0]++;
        else
            this.context.playerScore[1]++;
        this.getEntityManager().getSquareBall().reset(this.getCanvas());
    }

    exit(): void {
        
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.getEntityManager().drawEntities(ctx);
        this.drawCurrentUi()
    }

    update(deltaTime: number): StateResult | null {
        if (this.#waitFrames != 60){
            this.#waitFrames++;
            return (null)
        }
        else {
            return({nextState: "PlayingState", shouldEnter: false})
        }
            
    }

    handleInput(event: KeyboardEvent, keyDown: boolean): void {
        
    }

}