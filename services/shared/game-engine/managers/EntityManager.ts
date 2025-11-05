import Ball from "../entities/Ball.js";
import Paddle from "../entities/Paddle.js";
import Entity from "../entities/Entity.js";
import type { PlayerInputs } from "../../types/pong.types.js";

export default class EntityManager {
    #entities: Entity[] = []
    #paddles: Paddle[] = []
    #ball!: Ball

    constructor() {}

    // Takes in paddle inputs in an array
    playerInputs(p1?: PlayerInputs, p2?: PlayerInputs):void {
        if (p1)
            this.#paddles[0].input(p1)
        if (p2)
            this.#paddles[1].input(p2)
    }

    checkCollisions(): void {
        for (const player of this.#paddles){
            this.#ball.collision(player.getBorder(), player.getOldBorder())
            player.collision(this.#ball.getBorder(), this.#ball.getOldBorder());
        }
    }

    tickEntities(deltaTime: number): void {
        for (const entity of this.#entities) {
            entity.tick(deltaTime);
        }
    }

    addPlayer(paddle: Paddle): void {
        this.#entities.push(paddle);
        this.#paddles.push(paddle);
    }

    addBall(ball: Ball): void {
        this.#entities.push(ball);
        this.#ball = ball;
    }

    removePlayer(index: number): void {
        this.#paddles.splice(index, 1);
    }

    getPaddles(): Paddle[] {
        return this.#paddles
    }

    getBall(): Ball {
        return this.#ball
    }
}