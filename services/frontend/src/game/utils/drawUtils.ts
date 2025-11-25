import type { Vector } from "shared/game-engine/components/Vector";

export function drawCircle(pos: Vector, radius: number, color: string, scale: Vector, ctx: CanvasRenderingContext2D): void{
    ctx.save();
    ctx.scale(scale.x, scale.y)
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
    ctx.restore()
}

export function drawRoundRect(pos: Vector, size: Vector, radius: number, color: string, scale: Vector, ctx: CanvasRenderingContext2D)
{
    ctx.save();
    ctx.beginPath();
    ctx.scale(scale.x, scale.y);
    ctx.fillStyle = color
    ctx.roundRect(pos.x - size.x / 2, pos.y - size.y / 2, size.x, size.y, radius);
    ctx.fill();
    ctx.restore();
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

export function drawWrappedString(
    text: string,
    position: { x: number; y: number },
    color: string,
    font: string,
    maxWidth: number,
    lineHeight: number,
    scale: { x: number; y: number },
    ctx: CanvasRenderingContext2D
): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    // Build lines that fit within maxWidth
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width / scale.x;

        if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) {
        lines.push(currentLine);
    }

    // Draw each line
    const totalHeight = lines.length * lineHeight;
    const startY = position.y - (totalHeight / 2) + (lineHeight / 2);

    lines.forEach((line, index) => {
        const y = (startY + (index * lineHeight)) * scale.y;
        ctx.fillText(line, position.x * scale.x, y);
    });

    ctx.restore();
}