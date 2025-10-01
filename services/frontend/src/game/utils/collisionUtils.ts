import { type Border, type CollisionResult } from "../definitions";

export function squaresAreColliding(square1: Border, square2: Border): CollisionResult {
    let result: CollisionResult = {
        isColliding: (
        square1.left < square2.right && 
        square1.right > square2.left &&
        square1.top < square2.bottom &&
        square1.bottom > square2.top
    )};

    if (!result.isColliding)
        return (result);

    let l_overlap = Math.abs(square1.right - square2.left);
    let r_overlap = Math.abs(square2.right - square1.left);
    let t_overlap = Math.abs(square1.top - square2.bottom);
    let b_overlap = Math.abs(square2.top - square1.bottom);

    const min_overlap = Math.min(l_overlap, r_overlap, t_overlap, b_overlap);

    switch (min_overlap) {
        case (l_overlap):
            result.side = "left";
            break;
        case (r_overlap):
            result.side = "right";
            break;
        case (t_overlap):
            result.side = "top";
            break;
        case (b_overlap):
            result.side = "bottom";
            break;
    }

    result.position = square2;
    return (result);
}