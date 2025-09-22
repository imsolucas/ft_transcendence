import type { Circle, Rectangle, Vector } from "../definitions";

export function drawCircle(pos: Vector, circle: Circle, color: string, ctx: CanvasRenderingContext2D): void{
    console.log("Drawing circle");
    ctx.beginPath()
    ctx.arc(
        pos.x,
        pos.y,
        circle.radius,
        0, 
        2 * Math.PI
    )
    ctx.fill()
    ctx.fillStyle = color;
}

export function drawRectangle(pos: Vector, rect: Rectangle, color: string, ctx: CanvasRenderingContext2D): void{
    ctx.beginPath()
    ctx.fillStyle = color,
    ctx.fillRect(
        pos.x,
        pos.y,
        rect.width,
        rect.height,
    )
}