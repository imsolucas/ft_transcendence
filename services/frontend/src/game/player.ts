import type { Vector } from "./definitions";
import { Entity } from "./entity";
import { __friction__, __speed__ } from "./definitions";

export class Player extends Entity {
    constructor(pos: Vector, color: string) {
        super(pos, {x: 25, y: 150}, color);
    }

    tick(): void {
        this.pos.y += this.velocity.y;

        this.velocity.y *= __friction__;
    }

    move(up: boolean, down: boolean): void {
        if (up)
            this.velocity.y = -__speed__;
        if (down)
            this.velocity.y = __speed__;
    }
}