import type { Circle, Rectangle, Vector } from "../definitions";
import { drawCircle, drawRectangle } from "../utils/drawUtils";

export default abstract class Entity <T extends Rectangle | Circle> {
    protected velocity: Vector = {x:0, y: 0};

    constructor (
        protected pos: Vector,
        protected shape: T,
        protected color: string,
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

    public draw(ctx: CanvasRenderingContext2D): void {
        if ('radius' in this.shape)
            drawCircle(this.pos, this.shape, this.color, ctx);
        else
            drawRectangle(this.pos, this.shape, this.color, ctx);
    }

    public abstract tick(deltaTime: number, canvas: HTMLCanvasElement): void
}