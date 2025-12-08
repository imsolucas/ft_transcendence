import type { Vector } from "./Vector.js";

export interface Sprite {
    pos: Vector,
    img: typeof Image
}