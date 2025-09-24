import type {  Vector } from "../definitions";

export default abstract class Entity {

    constructor (
        protected pos: Vector,
        protected color: string,
        protected velocity: Vector = {x:0, y:0}
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

    public move(pos: Vector): void {
        this.pos.x += pos.x;
        this.pos.y += pos.y;
    }
    
    public abstract draw(ctx: CanvasRenderingContext2D): void
    public abstract tick(deltaTime: number, canvas: HTMLCanvasElement): void
}