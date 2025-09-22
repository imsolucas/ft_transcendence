import type { Vector } from "../definitions";

export function drawCircle(pos: Vector, radius: number, color: string, ctx: CanvasRenderingContext2D): void{
    ctx.beginPath()
    ctx.arc(
        pos.x,
        pos.y,
        radius,
        0, 
        2 * Math.PI
    )
    ctx.fill()
    ctx.fillStyle = color;
}

export function drawRectangle(pos: Vector, size: Vector, color: string, ctx: CanvasRenderingContext2D): void{
    ctx.beginPath()
    ctx.fillStyle = color,
    ctx.fillRect(
        pos.x,
        pos.y,
        size.x,
        size.y,
    )
}