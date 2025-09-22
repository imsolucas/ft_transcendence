import type { Vector, Rectangle, Border } from "../definitions";
import Entity from "./entity";
import { __friction__, __speed__, PLAYER_HEIGHT, PLAYER_WIDTH } from "../definitions";

export default class Player extends Entity<Rectangle> {
    constructor(pos: Vector, color: string) {
        super(pos, {width: PLAYER_WIDTH, height: PLAYER_HEIGHT}, color);
    }

    border(): Border{
        return {
            top: this.pos.y,
            bottom: this.pos.y + this.shape.height,
            left: this.pos.x,
            right: this.pos.x + this.shape.width
        };
    }

    tick(deltaTime: number , canvas: HTMLCanvasElement): void {
        const border = this.border();

        if (border.top + this.velocity.y < 0 )
            this.pos.y = 0;
        else if (border.bottom + this.velocity.y > canvas.height)
            this.pos.y = canvas.height - this.shape.height;
        else {
            this.pos.y += this.velocity.y;
            this.velocity.y *= __friction__;
        }
    }

    key(up: boolean, down: boolean): void {
        if (up)
            this.velocity.y = -__speed__;
        if (down)
            this.velocity.y = __speed__;
    }
}