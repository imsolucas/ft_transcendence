import { GameState, type GameContext, type StateResult } from "./GameState";
import { drawRectangle } from "../utils/drawUtils";
import { constants, type PlayerInputs } from "../definitions";

export default class PlayingState extends GameState {
    #playerInputs: PlayerInputs[] = []
    #paused = false;

    constructor (context: GameContext) {
        super(context, "PlayingState")
        this.#playerInputs.push({up: false, down: false, left: false, right: false})
        this.#playerInputs.push({up: false, down: false, left: false, right: false})
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
        this.getEntityManager().getSquareBall().reset(this.getCanvas())
        this.getEntityManager().getSquareBall().randomVelocity();
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
            return ({nextState: "ScoredState"})
        return (null)
    }
    
    render(ctx: CanvasRenderingContext2D): void {
        this.getEntityManager().drawEntities(ctx);
        this.#drawUi(this.getCanvas());
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

    #drawUi(canvas: HTMLCanvasElement): void {
        const line_size = canvas.height / constants.BALL_SIZE;
        let i = 0;
        
        while (i < line_size)
        {
            if (i % 2 == 0)
                drawRectangle({x: canvas.width / 2, y: i * constants.BALL_SIZE}, {x: constants.BALL_SIZE, y:constants.BALL_SIZE}, "white", this.getCtx());
            i++;
        }
    }
}