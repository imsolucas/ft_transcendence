import type { BallConfig, PlayerConfig } from "shared/index";
import { constants } from "shared";

export namespace default_config {
    export const player: PlayerConfig = {
        color: "#950ae6",
        size: {x: constants.PLAYER_WIDTH, y: constants.PLAYER_HEIGHT },
    }

    export const ball: BallConfig = {
        color: "#d712a9",
        size: {x: constants.BALL_SIZE, y: constants.BALL_SIZE},
    }
}