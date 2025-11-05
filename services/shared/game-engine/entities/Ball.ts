import type { Border } from "../components/Hitbox.js";
import type { Vector } from "../components/Vector.js";
import { constants } from "../constants.js";
import Entity from "./Entity.js";

export default class Ball extends Entity {
    #size: Vector;
    #scoringPlayer: number = -1;
    #oldpos!: Vector;
    #destroyed: boolean = false;

    constructor(color: string, pos: Vector = {x:0, y:0}, size: Vector = {x: constants.BALL_SIZE, y: constants.BALL_SIZE}, velocity: Vector = {x:0, y:0})
    {
        super(pos, color, velocity, {width: size.x, height: size.y});
        this.#size = size;
    }

    public getOldBorder () {
        return {
            top: this.#oldpos.y - this.hitbox!.height / 2,
            bottom: this.#oldpos.y + this.hitbox!.height / 2,
            left: this.#oldpos.x - this.hitbox!.width / 2,
            right: this.#oldpos.x + this.hitbox!.width - this.hitbox!.width / 2
        }
    }

    public getBorder(): Border {
        return {
            top: this.pos.y - this.hitbox!.height / 2,
            bottom: this.pos.y + this.hitbox!.height / 2,
            left: this.pos.x - this.hitbox!.width / 2,
            right: this.pos.x + this.hitbox!.width - this.hitbox!.width / 2
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

    public tick(deltaTime: number): void {

        const border = this.getBorder();
        const cur_vel_y = this.velocity.y * deltaTime;
        const cur_vel_x = this.velocity.x * deltaTime;
        
        this.#oldpos = { ...this.pos };
        if (border.top + cur_vel_y <= 0)
        {
            this.velocity.y = Math.abs(this.velocity.y)
            this.pos.y = this.#size.y / 2;
        }
        else if (border.bottom + cur_vel_y >= constants.COURT_HEIGHT)
        {
            this.velocity.y = -Math.abs(this.velocity.y)
            this.pos.y = constants.COURT_HEIGHT - this.#size.y / 2;
        }
        else if (border.right <= 0 || border.left >= constants.COURT_WIDTH) {
            this.#destroyed = true
        }
        this.pos.y += cur_vel_y;
        this.pos.x += cur_vel_x ;
    }

    public reset(): void {
        this.pos = {
                    x: constants.COURT_WIDTH / 2,
                    y: constants.COURT_HEIGHT / 2
        }
        this.#destroyed = false
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