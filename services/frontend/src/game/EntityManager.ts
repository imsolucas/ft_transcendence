import SquareBall from "./entities/SquareBall";
import Player from "./entities/Player";
import Entity from "./entities/Entity";
import type { PlayerInputs } from "./definitions";

export default class EntityManager {
    #entities: Entity[] = []
    #players: Player[] = []
    // #balls: Ball[] = []
    #squareball!: SquareBall

    constructor() {}

    // Takes in player inputs in an array
    playerInputs(inputs: PlayerInputs[]):void {
        for (let i in this.#players){
            this.#players[i].input(inputs[i]);
        }
    }

    checkCollisions(): void {
        for (var player of this.#players){
            this.#squareball.collision(player.getBorder(), player.getOldBorder())
            player.collision(this.#squareball.getBorder(), this.#squareball.getOldBorder());
        }
    }

    tickEntities(deltaTime: number, canvas: HTMLCanvasElement): void {
        for (var entity of this.#entities) {
            entity.tick(deltaTime, canvas);
        }
    }

    drawEntities(ctx: CanvasRenderingContext2D): void {
        for (var entity of this.#entities)
            entity.draw(ctx);
    }

    addPlayer(player: Player): void {
        this.#entities.push(player);
        this.#players.push(player);
    }

    addSquareBall(squareball: SquareBall): void {
        this.#entities.push(squareball);
        this.#squareball = squareball;
    }

    // addBall(ball: Ball): void {
    //     this.#entities.push(ball);
    //     this.#balls.push(ball);
    // }
    
    removePlayer(index: number): void {
        this.#players.splice(index, 1);
    }

    // removeBall(index: number): void {
    //     this.#balls.splice(index, 1);
    // }

    getPlayer(index: number): Player {
        return this.#players[index];
    }

    getSquareBall(): SquareBall {
        return this.#squareball;
    }

    // getBall(index: number): Ball {
    //     return this.#balls[index];
    // }
}