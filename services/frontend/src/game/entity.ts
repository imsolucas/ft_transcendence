import type { Bounds, Vector } from "./definitions";

export class Entity {
    protected velocity: Vector = {x:0, y: 0};
    protected size: Vector;
    protected pos: Vector;
    protected color: string;

    constructor (pos: Vector, size: Vector, color: string) {
        this.pos = pos;
        this.size = size;
        this.color = color;
    }

    public bounds (): Bounds{
        return ({
            top: this.pos.y,
            bottom: this.pos.y + this.size.y,
            left: this.pos.x,
            right: this.pos.x + this.size.x
        })
    }

    public isColliding(entity: Entity): boolean {
        const otherBounds = entity.bounds();
        const myBounds = this.bounds();
        return (
            myBounds.top < otherBounds.bottom ||
            myBounds.bottom > otherBounds.top ||
            myBounds.left < otherBounds.right ||
            myBounds.right > otherBounds.left
        )
    }

    tick(): void {

    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.pos.x,
            this.pos.y,
            this.size.x,
            this.size.y,
        );
    }
}