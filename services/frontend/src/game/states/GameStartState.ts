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
            x: 50 + constants.PLAYER_WIDTH / 2,
            y: this.getCanvas().height / 2
        })
        this.getEntityManager().getPlayer(1).setPos({
            x: this.getCanvas().width - constants.PLAYER_WIDTH / 2 - 50,
            y: this.getCanvas().height / 2
        })
        this.getEntityManager().getSquareBall().reset(this.getCanvas());
        for (let i in this.getPlayerScore())
            this.getPlayerScore()[i] = 0;
    }

    exit(): void {
        
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.getEntityManager().drawEntities(ctx)
        this.drawCurrentUi()
        drawString("PRESS SPACE TO PLAY", {x: this.getCanvas().width / 2, y: this.getCanvas().height / 2}, "grey", "100px 'Courier New', monospace", ctx);
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