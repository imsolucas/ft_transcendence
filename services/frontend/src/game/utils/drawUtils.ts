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
    ctx.fillStyle = color
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

export function drawString(txt: string, pos: Vector, color: string,style: string, ctx: CanvasRenderingContext2D){
    ctx.fillStyle = color;
    ctx.font = style;
    ctx.textAlign = "center"

    const lines = txt.split('\n');

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], pos.x, pos.y + i * ctx.measureText(lines[i]).fontBoundingBoxAscent);
    }
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
    drawString(context.playerScore[0].toString(), {x: context.canvas.width / 2 - 50, y: 100}, "white","100px 'Courier New', monospace", context.ctx);
    drawString(context.playerScore[1].toString(), {x: context.canvas.width / 2 + 50, y: 100}, "white","100px 'Courier New', monospace", context.ctx);
}