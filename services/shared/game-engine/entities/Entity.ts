import type { GameConfig } from "../../types/pong.types.ts";
import type { Hitbox } from "../components/Hitbox.ts";
import type { Sprite } from "../components/Sprite.ts";
import type { Vector } from "../components/Vector.ts";

export default abstract class Entity {

    // plain fields (no parameter properties): Node's type stripping runs the engine (users service)
    protected pos: Vector;
    protected color: string;
    protected config: GameConfig;
    protected velocity: Vector;
    protected hitbox?: Hitbox | undefined;
    protected sprite?: Sprite | undefined;

    constructor (pos: Vector, color: string, config: GameConfig, velocity: Vector = {x:0, y:0}, hitbox?: Hitbox, sprite?: Sprite) {
        this.pos = pos;
        this.color = color;
        this.config = config;
        this.velocity = velocity;
        this.hitbox = hitbox;
        this.sprite = sprite;
    }

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