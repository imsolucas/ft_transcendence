import type { Vector, Border, PlayerInputs } from "../definitions";
import Entity from "./Entity";
import { constants } from "../definitions";
import { drawRectangle} from "../utils/drawUtils";

export default class Player extends Entity {
    #size: Vector;
    #oldpos!: Vector;

    constructor(color: string, pos: Vector = {x:0, y:0}, size: Vector = {x: constants.PLAYER_WIDTH, y: constants.PLAYER_HEIGHT}) {
        super(pos, color);
        this.#size = size;
    }

    getOldBorder(): Border {
        return {
            top: this.#oldpos.y - this.#size.y / 2,
            bottom: this.#oldpos.y + this.#size.y / 2,
            left: this.#oldpos.x - this.#size.x / 2,
            right: this.#oldpos.x + this.#size.x - this.#size.x / 2
        }
    }
        
    getBorder(): Border{
        return {
            top: this.pos.y - this.#size.y / 2,
            bottom: this.pos.y + this.#size.y / 2,
            left: this.pos.x - this.#size.x / 2,
            right: this.pos.x + this.#size.x - this.#size.x / 2
        }
    }

    tick(deltaTime: number , canvas: HTMLCanvasElement): void {
        const border = this.getBorder();

        this.#oldpos = { ...this.pos };
        if (border.top + this.velocity.y < 0 )
            this.pos.y = this.#size.y / 2;
        else if (border.bottom + this.velocity.y > canvas.height)
            this.pos.y = canvas.height - this.#size.y / 2;
        else {
            this.pos.y += this.velocity.y;
            this.velocity.y *= constants.PLAYER_FRICTION;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void{
        drawRectangle(this.pos, this.#size, this.color, ctx);
    }

    collision(other: Border, old_other: Border): boolean {
        const border = this.getBorder()
        const old_border = this.getOldBorder();

        if (!(
            border.left < other.right && 
            border.right > other.left &&
            border.top < other.bottom &&
            border.bottom > other.top
        ))
            return false;
        
        if (border.top <= other.bottom && old_border.top >= old_other.bottom){
            this.pos.y = other.bottom + this.#size.y / 2;
        }
        if (border.bottom >= other.top && old_border.bottom <= old_other.top){
            this.pos.y = other.top - this.#size.y / 2;
        }
        return true;
    }

    input(input: PlayerInputs): void {
        if (input.up)
            this.velocity.y = -constants.PLAYER_SPEED;
        if (input.down)
            this.velocity.y = constants.PLAYER_SPEED;
    }
}