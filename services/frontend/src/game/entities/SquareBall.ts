import type { Border, Vector } from "../definitions";
import { drawRectangle,  drawVector } from "../utils/drawUtils";
import { constants, type CollisionResult} from "../definitions";
import Entity from "./Entity";

export default class SquareBall extends Entity {
    #size: Vector;
    #oldpos!: Vector;
    #destroyed: boolean = false;

    constructor(color: string, pos: Vector = {x:0, y:0},size: Vector = {x: 25, y: 25}, velocity: Vector = {x:0, y:0})
    {
        super(pos, color, velocity)
        this.#size = size;
    }

    public getOldBorder () {
        return {
            top: this.#oldpos.y - this.#size.y / 2,
            bottom: this.#oldpos.y + this.#size.y / 2,
            left: this.#oldpos.x - this.#size.x / 2,
            right: this.#oldpos.x + this.#size.x - this.#size.x / 2
        }
    }

    public getBorder(): Border {
        return {
            top: this.pos.y - this.#size.y / 2,
            bottom: this.pos.y + this.#size.y / 2,
            left: this.pos.x - this.#size.x / 2,
            right: this.pos.x + this.#size.x - this.#size.x / 2
        }
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
        
        this.#oldpos = { ...this.pos };
        if (new_y < 0 || new_y + this.#size.y > canvas.height) {
            this.velocity.y *= -1;
            if (new_y < 0)
                this.pos.y = 0;
            else
                this.pos.y = canvas.height - this.#size.y;
        }
        else if (new_x < 0 || new_x + this.#size.x > canvas.width) {
            this.#destroyed = true;
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
                    x: canvas.width / 2,
                    y: canvas.height / 2
        }
        this.#destroyed = false
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        if (!this.#destroyed)
            drawRectangle(this.pos, this.#size, this.color, ctx);
        // drawVector(this.pos, this.velocity, "red", ctx);
    }

    public collision(other: Border, old_other: Border): boolean {
        const border = this.getBorder()
        const old_border = this.getOldBorder();

        if (!(
            border.left < other.right && 
            border.right > other.left &&
            border.top < other.bottom &&
            border.bottom > other.top
        ))
            return false;
        
        this.velocity.x *= -1;
        if (border.right >= other.left && old_border.right <= old_other.left){
            this.pos.x = other.left - this.#size.x / 2;
        }
        if (border.left <= other.right && old_border.left >= old_other.right){
            this.pos.x = other.right + this.#size.x / 2;
        }
        if (border.top <= other.bottom && old_border.top >= old_other.bottom){
            this.velocity.y = Math.abs(this.velocity.y);
            this.pos.y = other.bottom + this.#size.y / 2;
        }
        if (border.bottom >= other.top && old_border.bottom <= old_other.top){
            this.velocity.y = -Math.abs(this.velocity.y);
            this.pos.y = other.top - this.#size.y / 2;
        }
        return true;
    }
}