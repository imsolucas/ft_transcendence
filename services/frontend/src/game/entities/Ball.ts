import { constants, type Vector } from "../definitions";
import { drawCircle } from "../utils/drawUtils";
import Entity  from "./Entity";

export default class Ball extends Entity {
    #radius: number;

    constructor (color: string, pos: Vector = {x:0, y:0}, radius: number = constants.BALL_SIZE) {
        super(pos, color);
        this.#radius = radius;
    }

    public randomVelocity(): void {
        const max = 7;
        const min = 5;
        this.pos = {
            x:(Math.random() * (max - min) + min),
            y:(Math.random() * (max - min) + min)};
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