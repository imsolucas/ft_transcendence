import type { Vector } from "./Vector.js";

export interface Hitbox {
    width: number,
    height: number
}

export interface Border {
    top: number,
    bottom: number,
    left: number,
    right: number
}

export interface CollisionResult {
    isColliding: boolean;
    side?: "top" | "bottom" | "left" | "right";
    position?: Hitbox;
}
