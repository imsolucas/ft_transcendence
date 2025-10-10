import type { Border, Vector } from "../definitions";
import { drawRectangle,  drawVector } from "../utils/drawUtils";
import { constants, type CollisionResult} from "../definitions";
import Entity from "./Entity";

export default class SquareBall extends Entity {
    #size: Vector;
    #scoringPlayer: number = -1;
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

    public getScoringPlayer(): number {
        return this.#scoringPlayer;
    }

    public randomVelocity(): void {
        const max = constants.BALL_SPEED_MAX;
        const min = constants.BALL_SPEED_MIN;
        this.velocity = {
            x:(Math.random() * (max - min) + min),
            y:(Math.random() * (max - min) + min)};
    }

    public tick(deltaTime: number, canvas: HTMLCanvasElement): void {

        const border = this.getBorder();
        const cur_vel_y = this.velocity.y * deltaTime;
        const cur_vel_x = this.velocity.x * deltaTime;
        
        this.#oldpos = { ...this.pos };
        if (border.bottom + cur_vel_y <= 0)
        {
            this.velocity.y = Math.abs(this.velocity.y)
            this.pos.y = this.#size.y / 2;
        }
        else if (border.top + cur_vel_y >= canvas.height)
        {
            this.velocity.y = -Math.abs(this.velocity.y)
            this.pos.y = canvas.height - this.#size.y / 2;
        }
        else if (border.right <= 0 || border.left >= canvas.width) {
            this.#destroyed = true
        }
        this.pos.y += cur_vel_y;
        this.pos.x += cur_vel_x ;
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