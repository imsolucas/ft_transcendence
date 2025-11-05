import type { Hitbox } from "../components/Hitbox.js";
import type { Sprite } from "../components/Sprite.js";
import type { Vector } from "../components/Vector.js";

export default abstract class Entity {

    constructor (
        protected pos: Vector,
        protected color: string,
        protected velocity: Vector = {x:0, y:0},
        protected hitbox?: Hitbox,
        protected sprite?: Sprite
    ) {}

    public setVelocity(velocity: Vector): void {
        this.velocity = velocity;
    }

    public getVelocity(): Vector {
        return this.velocity;
    }

    public setPos(pos: Vector): void {
        this.pos = pos;
    }

    public getPos(): Vector{
        return (this.pos);
    }   

    public getSprite(): Sprite | undefined {
        return this.sprite
    }

    public getHibox(): Hitbox | undefined {
        return this.hitbox
    }

    public move(pos: Vector): void {
        this.pos.x += pos.x;
        this.pos.y += pos.y;
    }
    
    public abstract tick(deltaTime: number): void
}