import type { Vector, Border } from "../definitions";
import Entity from "./entity";
import { PLAYER_FRICTION, PLAYER_SPEED, PLAYER_HEIGHT, PLAYER_WIDTH } from "../definitions";
import { drawRectangle } from "../utils/drawUtils";

export default class Player extends Entity {
    #size: Vector;

    constructor(pos: Vector, color: string, size: Vector = {x: PLAYER_WIDTH, y: PLAYER_HEIGHT}) {
        super(pos, color);
        this.#size = size;
    }

    border(): Border{
        return {
            top: this.pos.y,
            bottom: this.pos.y + this.#size.y,
            left: this.pos.x,
            right: this.pos.x + this.#size.x
        };
    }

    tick(deltaTime: number , canvas: HTMLCanvasElement): void {
        const border = this.border();

        if (border.top + this.velocity.y < 0 )
            this.pos.y = 0;
        else if (border.bottom + this.velocity.y > canvas.height)
            this.pos.y = canvas.height - this.#size.y;
        else {
            this.pos.y += this.velocity.y;
            this.velocity.y *= PLAYER_FRICTION;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void{
        drawRectangle(this.pos, this.#size, this.color, ctx);
    }

    input(up: boolean, down: boolean): void {
        if (up)
            this.velocity.y = -PLAYER_SPEED;
        if (down)
            this.velocity.y = PLAYER_SPEED;
    }
}