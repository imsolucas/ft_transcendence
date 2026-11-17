import type { GameConfig } from "shared";

/** Mirrors services/shared default_config.standardGame (the engine sets sizes itself). */
export function baseGameConfig(): GameConfig {
  return {
    paddleConfig: { color: "#ff2e97", speed: 47, size: { x: 4, y: 25 } },
    ballConfig: { color: "#f3eeff", speed: 50, size: { x: 4, y: 4 } },
    courtSize: { x: 160, y: 100 },
    playerNames: [],
    backgroundColor: "#0b0614",
    pointsToWin: 5,
    isPrivate: false,
    mode: "standard",
  };
}
