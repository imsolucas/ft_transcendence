import type { PlayerInputs } from "../types/pong.types.js";
import Ball from "./entities/Ball.js";
import Paddle from "./entities/Paddle.js";
import EntityManager from "./managers/EntityManager.js";
import { StateManager } from "./managers/StateManager.js";
import type { GameContext } from "./states/BaseGameState.js";
import GameOverState from "./states/GameOverState.js";
import GameStartState from "./states/GameStartState.js";
import PlayingState from "./states/PlayingState.js";
import ScoredState from "./states/ScoredState.js";

export class GameEngine {
    #context: GameContext;
    #entityManager: EntityManager = new EntityManager;
    #stateManager: StateManager;
    #isRunning = false;
    #previousTime: number = 0;

    constructor ()
    {  
        this.#context = {
            entityManager: this.#entityManager,
            playerScore: [0, 0]
        }
        this.#stateManager = new StateManager(this.#context);
        this.#initEntities();
        this.#initStates();
    }

    #initStates():void {
        // Init the Base States
        this.#stateManager.registerState("PlayingState", PlayingState)
        this.#stateManager.registerState("ScoredState", ScoredState)
        this.#stateManager.registerState("GameOverState", GameOverState)
        this.#stateManager.registerState("GameStartState", GameStartState)

        this.#stateManager.transitionTo("GameStartState");
    }

    #initEntities():void {
        this.#entityManager.addPlayer(new Paddle("#ffffff"));
        this.#entityManager.addPlayer(new Paddle("#ffffff"));
        this.#entityManager.addBall(new Ball("#ffffff"));
    }

    input(p1?: PlayerInputs, p2?: PlayerInputs): void {
        this.#stateManager.handleInput(p1, p2);
    }

    // Moves the game one tick forwards
    tick(deltaTime: number): void {
        this.#entityManager.tickEntities(deltaTime)
    }

    getPaddles(): Paddle[] {
        return this.#entityManager.getPaddles()
    }

    getBall(): Ball {
        return this.#entityManager.getBall()
    }

    getContext(): GameContext {
        return this.#context
    }

}