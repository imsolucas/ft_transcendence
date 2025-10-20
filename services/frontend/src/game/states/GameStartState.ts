import { drawString } from "../utils/drawUtils";
import { constants } from "../definitions";
import { GameState, type GameContext, type StateResult } from "./GameState";

// State for when the game starts, awaits input from the player to start the game (should probably be a nicer menu in the future)
export default class GameStartState extends GameState{
    #start = false;

    constructor(context: GameContext) {
        super(context, "GameStartState")
    }

    enter(): void {
        this.getEntityManager().getPlayer(0).setPos({
            x: constants.PLAYER_WIDTH,
            y: constants.COURT_HEIGHT / 2
        })
        this.getEntityManager().getPlayer(1).setPos({
            x: constants.COURT_WIDTH - constants.PLAYER_WIDTH,
            y: constants.COURT_HEIGHT / 2
        })
        for (let i in this.getPlayerScore())
            this.getPlayerScore()[i] = 0;
        this.getEntityManager().getSquareBall().reset(this.getCanvas())
        this.getEntityManager().getSquareBall().randomVelocity();
    }

    exit(): void {
        
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.getEntityManager().drawEntities(ctx)
        this.drawCurrentUi()
        drawString("PRESS SPACE TO PLAY", {x: constants.COURT_SIZE / 2 * ctx.canvas.width, y: constants.COURT_SIZE / 2 * ctx.canvas.height}, "grey", "100px 'Courier New', monospace", ctx);
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