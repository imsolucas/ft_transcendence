import type { Border, Vector } from "../definitions";
import { drawRectangle } from "../utils/drawUtils";
import { constants } from "../definitions";
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
        const max = 7;
        const min = 5;
        this.velocity = {
            x:(Math.random() * (max - min) + min),
            y:(Math.random() * (max - min) + min)};
    }

    public tick(deltaTime: number, canvas: HTMLCanvasElement): void {
        if (this.pos.y + this.#size.y + this.velocity.y < 0 ||
            this.pos.y + this.#size.y + this.velocity.y > canvas.height){
                this.velocity.y *= -1;
            }
        if (this.pos.x + this.#size.x + this.velocity.x < 0 ||
            this.pos.x + this.#size.x + this.velocity.x > canvas.width){
                // this.#destroyed = true;
                this.velocity.x *= -1;
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

    public onCollision(): void {
        this.velocity.x *= -1
        this.color = "#fff3a32"
    }
}