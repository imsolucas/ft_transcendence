import { type Border } from "../definitions";

export function squaresAreColliding(square1: Border, square2: Border): boolean {
    return (
        square1.left < square2.right && 
        square1.right > square2.left &&
        square1.top < square2.bottom &&
        square1.bottom < square2.top
    )
}