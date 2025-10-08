import { type Vector, constants } from "../definitions";
import type { GameContext } from "../states/GameState";

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

export function classicPongUi(context: GameContext): void {
    const line_size = context.canvas.height / constants.BALL_SIZE;
    let i = 0;
    
    while (i < line_size)
    {
        if (i % 2 == 0)
            drawRectangle({x: context.canvas.width / 2, y: i * constants.BALL_SIZE}, {x: constants.BALL_SIZE, y:constants.BALL_SIZE}, "white", context.ctx);
        i++;
    }


}