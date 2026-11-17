import type { Vector } from "./Vector.ts";

export interface Sprite {
    pos: Vector,
    img: unknown // an image handle; the engine is renderer-agnostic
}