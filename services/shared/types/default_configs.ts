import type { BallConfig, PaddleConfig } from "./pong.types.ts";
import { defaults } from "../game-engine/defaults.ts";
import type { GameConfig } from "./pong.types.ts";

export namespace default_config {
    export const paddle: PaddleConfig = {
        color: "#F34C94",
        size: {x: defaults.PADDLE_WIDTH, y: defaults.PADDLE_HEIGHT },
        speed: defaults.PADDLE_SPEED
    }

    export const ball: BallConfig = {
        color: "#d712a9",
        size: {x: defaults.BALL_SIZE, y: defaults.BALL_SIZE},
        speed: defaults.BALL_SPEED_MAX
    }

    export const standardGame: GameConfig = {
        paddleConfig: default_config.paddle,
        ballConfig: default_config.ball,
        courtSize: {x: defaults.COURT_WIDTH, y: defaults.COURT_HEIGHT},
        playerNames: [],
        backgroundColor: "#000000",
        pointsToWin: defaults.WIN_POINT,
        isPrivate: false,
        mode: 'standard'
    } 
}