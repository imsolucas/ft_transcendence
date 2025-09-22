import { BALL_SIZE, type Vector } from "../definitions";
import { drawCircle } from "../utils/drawUtils";
import Entity  from "./entity";

export default class Ball extends Entity {
    #radius: number;

    constructor (pos: Vector, color: string, radius: number = BALL_SIZE) {
        super(pos, color);
        this.#radius = radius;
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        drawCircle(this.pos, this.#radius, this.color, ctx);
    }

    public tick(deltaTime: number, canvas: HTMLCanvasElement): void {
        if (this.pos.y + this.velocity.y < 0 ||
            this.pos.y + this.velocity.y > canvas.height){
                this.velocity.y = -this.velocity;
                this.move({x:0, y: 10});
            }
        this.pos.y += this.velocity.y;
        this.pos.x += this.velocity.x;
    }
}