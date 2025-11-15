import type { BallConfig, PaddleConfig } from "shared/index";
import { defaults } from "shared";
import type { GameConfig } from "./pong.types.js";

export namespace default_config {
    export const paddle: PaddleConfig = {
        color: "#950ae6",
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
        backgroundColor: "#ae0909",
        pointsToWin: defaults.WIN_POINT,
        isPrivate: false,
        mode: 'standard'
    } 
}