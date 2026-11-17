import Ball from "../entities/Ball.ts";
import Paddle from "../entities/Paddle.ts";
import Entity from "../entities/Entity.ts";
import type { PlayerInputs } from "../../types/pong.types.ts";

type EntityConstructor<T extends Entity> = new (...args: any[]) => T;

export default class EntityManager {
    #entities: Entity[] = []
    #paddles: Paddle[] = []
    #ball!: Ball

    constructor() {}

    // Takes in paddle inputs in an array
    playerInputs(p1?: PlayerInputs, p2?: PlayerInputs):void {
        if (p1)
            this.#paddles[0]?.input(p1)
        if (p2)
            this.#paddles[1]?.input(p2)
    }

    checkCollisions(): void {
        for (const player of this.#paddles){
            this.#ball.collision(player.getBorder(), player.getOldBorder(), player.getVelocity())
            player.collision(this.#ball.getBorder(), this.#ball.getOldBorder());
        }
    }

    tickEntities<T extends Entity>(deltaTime: number, entityType?: EntityConstructor<T>): void {
        if (!entityType) {
            for (const entity of this.#entities) {
                entity.tick(deltaTime);
            }
        } else {
            for (const entity of this.#entities) {
                if (entity instanceof entityType) {
                    entity.tick(deltaTime);
                }
            }
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