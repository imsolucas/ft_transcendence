import { BALL_SIZE, type Circle, type Vector } from "../definitions";
import Entity  from "./entity";

export default class Ball extends Entity<Circle> {
    constructor (pos: Vector, color: string) {
        super(pos, {radius: BALL_SIZE}, color);
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