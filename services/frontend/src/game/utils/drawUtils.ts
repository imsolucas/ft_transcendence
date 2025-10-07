import type { Vector } from "../definitions";

export function drawCircle(pos: Vector, radius: number, color: string, ctx: CanvasRenderingContext2D): void{
    ctx.beginPath()
    ctx.fillStyle = color;
    ctx.arc(
        pos.x,
        pos.y,
        radius,
        0, 
        2 * Math.PI
    )
    ctx.fill()
}

export function drawRectangle(pos: Vector, size: Vector, color: string, ctx: CanvasRenderingContext2D): void{
    ctx.beginPath()
    ctx.fillStyle = color,
    ctx.fillRect(
        pos.x - size.x / 2,
        pos.y - size.y / 2,
        size.x,
        size.y,
    )
}

export function drawVector(pos: Vector, vector :Vector, color: string, ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + vector.x, pos.y + vector.y);
    ctx.stroke();   
}