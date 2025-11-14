import type { BallConfig, PaddleConfig } from "shared/index";
import { defaults } from "shared";

export namespace default_config {
    export const player: PaddleConfig = {
        color: "#950ae6",
        size: {x: defaults.PADDLE_WIDTH, y: defaults.PADDLE_HEIGHT },
        speed: defaults.PADDLE_SPEED
    }

    export const ball: BallConfig = {
        color: "#d712a9",
        size: {x: defaults.BALL_SIZE, y: defaults.BALL_SIZE},
        speed: defaults.BALL_SPEED_MAX
    }
}