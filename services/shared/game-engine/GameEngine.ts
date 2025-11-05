import Paddle from "./entities/Paddle.js";
import Ball from "./entities/Ball.js";
import EntityManager from "./EntityManager.js";
import { constants } from "./constants.js";
import { StateManager } from "./StateManager.js";
import PlayingState from "./states/PlayingState.js";
import type { GameContext } from "./states/BaseGameState.js";
import PausedState from "./states/PausedState.js";
import ScoredState from "./states/ScoredState.js";
import { classicPongUi } from "./utils/drawUtils.js";
import GameOverState from "./states/GameOverState.js";
import GameStartState from "./states/GameStartState.js";
import type { GameState } from "../types/pong.types.js";

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
        this.#stateManager.registerState("PlayingState", PlayingState)
        this.#stateManager.registerState("PausedState", PausedState)
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