import { defaults } from "../defaults.ts";
import type { GameConfig, PlayerInputs } from "../../types/pong.types.ts";
import type { Border } from "../components/Hitbox.ts";
import type { Vector } from "../components/Vector.ts";
import Entity from "./Entity.ts";

export default class Paddle extends Entity {
    #size: Vector;
    #oldpos!: Vector;

    constructor(config: GameConfig) {
        const paddleConfig = config.paddleConfig;

        super({x: 0, y:0}, paddleConfig.color, config, undefined, {width: paddleConfig.size!.x, height: paddleConfig.size!.y});
        this.#size = {...paddleConfig.size!};
    }

    /** Power-ups resize the paddle; it stays inside the court. */
    setHeight(height: number): void {
        this.#size.y = height;
        if (this.hitbox) this.hitbox.height = height;
        const half = height / 2;
        this.pos.y = Math.min(Math.max(this.pos.y, half), this.config.courtSize!.y - half);
    }

    getHeight(): number {
        return this.#size.y;
    }

    getOldBorder(): Border {
        return {
            top: this.#oldpos.y - this.#size.y / 2,
            bottom: this.#oldpos.y + this.#size.y / 2,
            left: this.#oldpos.x - this.#size.x / 2,
            right: this.#oldpos.x + this.#size.x - this.#size.x / 2
        }
    }
        
    getBorder(): Border{
        return {
            top: this.pos.y - this.#size.y / 2,
            bottom: this.pos.y + this.#size.y / 2,
            left: this.pos.x - this.#size.x / 2,
            right: this.pos.x + this.#size.x - this.#size.x / 2
        }
    }

    tick(deltaTime: number): void {
        const border = this.getBorder();
        const cur_vel_y = this.velocity.y * deltaTime;

        this.#oldpos = { ...this.pos };
        if (border.top + cur_vel_y < 0 )
            this.pos.y = this.#size.y / 2;
        else if (border.bottom + cur_vel_y > this.config.courtSize!.y)
            this.pos.y = this.config.courtSize!.y - this.#size.y / 2;
        else {
            this.pos.y += cur_vel_y;
        }
    }

    collision(other: Border, old_other: Border): boolean {
        const border = this.getBorder()
        const old_border = this.getOldBorder();

        if (!(
            border.left < other.right && 
            border.right > other.left &&
            border.top < other.bottom &&
            border.bottom > other.top
        ))
            return false;
        
        if (border.top <= other.bottom && old_border.top >= old_other.bottom){
            this.pos.y = other.bottom + this.#size.y / 2;
        }
        if (border.bottom >= other.top && old_border.bottom <= old_other.top){
            this.pos.y = other.top - this.#size.y / 2;
        }
        return true;
    }

    input(input: PlayerInputs): void {
        this.velocity.y = 0
        // paddleConfig.speed scales movement; the default speed crosses the court in 1 s
        // never trust the number: non-finite or out-of-range speeds fall back to the default
        const configured = Number(this.config.paddleConfig.speed);
        const factor = Number.isFinite(configured) && configured > 0 && configured <= defaults.PADDLE_SPEED * 2 ? configured / defaults.PADDLE_SPEED : 1;
        const speed = this.config.courtSize!.y * factor;

        if (input.up)
            this.velocity.y = -speed;
        if (input.down)
            this.velocity.y = speed;
    }
}