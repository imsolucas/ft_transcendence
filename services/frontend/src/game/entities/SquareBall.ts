import type { Border, Vector } from "../definitions";
import { drawRectangle } from "../utils/drawUtils";
import { constants, type CollisionResult} from "../definitions";
import Entity from "./Entity";

export default class SquareBall extends Entity {
    #size: Vector;
    #destroyed: boolean = false;

    constructor(color: string, pos: Vector = {x:0, y:0},size: Vector = {x: 25, y: 25}, velocity: Vector = {x:0, y:0})
    {
        super(pos, color, velocity)
        this.#size = size;
    }

    public getBorder(): Border {
        return {
            top: this.pos.y,
            bottom: this.pos.y + this.#size.y,
            left: this.pos.x,
            right: this.pos.x + this.#size.x
        };
    }

    public isDestroyed(): boolean {
        return this.#destroyed;
    }

    public randomVelocity(): void {
        const max = 10;
        const min = 7;
        this.velocity = {
            x:(Math.random() * (max - min) + min),
            y:(Math.random() * (max - min) + min)};
    }

    public tick(deltaTime: number, canvas: HTMLCanvasElement): void {

        let new_y = this.pos.y + this.velocity.y;
        let new_x = this.pos.x + this.velocity.x;
    
        if (new_y < 0 || new_y + this.#size.y > canvas.height) {
            this.velocity.y *= -1;
            if (new_y < 0)
                this.pos.y = 0;
            else
                this.pos.y = canvas.height - this.#size.y;
        }
        else if (new_x < 0 || new_x + this.#size.x > canvas.width) {
            // this.#destroyed = true;
            this.velocity.x *= -1;
            if (new_x < 0)
                this.pos.x = 0;
            else
                this.pos.x = canvas.width - this.#size.x;
        }

        this.pos.y += this.velocity.y;
        this.pos.x += this.velocity.x;
    }

    public reset(canvas: HTMLCanvasElement): void {
        this.pos = {
                    x: canvas.width / 2 - constants.BALL_SIZE,
                    y: canvas.height / 2 - constants.BALL_SIZE
        }
        this.#destroyed = false
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        drawRectangle(this.pos, this.#size, this.color, ctx);
    }

    public onCollision(collision: CollisionResult): void {
        if (collision.side == "top" || collision.side == "bottom"){
            this.velocity.y *= -1
            if (collision.side == "top")
                this.pos.y = collision.position?.top! - this.#size.y;
            else
                this.pos.y = collision.position?.bottom!;
        }
        {
            this.velocity.x *= -1
            if (collision.side == "left")
                this.pos.x = collision.position?.right!;
            if (collision.side == "right")
                this.pos.x = collision.position?.left!;
        }
    }
}