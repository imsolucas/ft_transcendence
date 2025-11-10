import type { Vector } from "shared/game-engine/components/Vector";

export function drawCircle(pos: Vector, radius: number, color: string, scale: Vector, ctx: CanvasRenderingContext2D): void{
    ctx.save();
    ctx.scale(scale.x, scale.y)
    ctx.beginPath()
    ctx.fillStyle = color;
    ctx.arc(
        pos.x,
        pos.y,
        radius * scale.x,
        0, 
        2 * Math.PI
    )
    ctx.fill()
    ctx.restore()
}

export function drawRectangle(pos: Vector, size: Vector, color: string, scale: Vector, ctx: CanvasRenderingContext2D): void{
    ctx.save()
    ctx.beginPath()
    ctx.scale(scale.x, scale.y);
    ctx.fillStyle = color
    ctx.fillRect(
        pos.x - size.x / 2,
        pos.y - size.y / 2,
        size.x,
        size.y,
    )
    ctx.restore()
}

export function drawVector(pos: Vector, vector :Vector, color: string, scale: Vector, ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.scale(scale.x, scale.y);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + vector.x, pos.y + vector.y);
    ctx.stroke();
    ctx.restore();
}

export function drawString(txt: string, pos: Vector, color: string,style: string, scale: Vector, ctx: CanvasRenderingContext2D){
    ctx.save();
    ctx.scale(scale.x, scale.y);
    ctx.fillStyle = color;
    ctx.font = style;
    ctx.textAlign = "center"

    const lines = txt.split('\n');

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], pos.x, pos.y + i * ctx.measureText(lines[i]).fontBoundingBoxAscent);
    }
    ctx.restore();
}