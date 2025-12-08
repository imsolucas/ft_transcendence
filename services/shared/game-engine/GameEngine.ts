import type { GameConfig, GameState, PlayerInputs } from "../types/pong.types.js";
import Ball from "./entities/Ball.js";
import Paddle from "./entities/Paddle.js";
import EntityManager from "./managers/EntityManager.js";
import { StateManager } from "./managers/StateManager.js";
import type { GameContext, StateName } from "./states/BaseGameState.js";
import GameOverState from "./states/GameOverState.js";
import GameStartState from "./states/GameStartState.js";
import PlayingState from "./states/PlayingState.js";
import ScoredState from "./states/ScoredState.js";
import { defaults } from "./defaults.js";

export class GameEngine {
    #config!: GameConfig;
    #context: GameContext;
    #entityManager: EntityManager = new EntityManager;
    #stateManager: StateManager;
    #isRunning = false;
    #previousTime: number = 0;

    constructor (config: GameConfig, initialState: StateName = "GameStartState")
    {  
        this.#initConfig(config);
        this.#context = {
            config: config,
            entityManager: this.#entityManager,
            playerScore: [0, 0]
        }
        this.#stateManager = new StateManager(this.#context);
        this.#initEntities();
        this.#initStates(initialState);
    }

    // Set defaults which are not set in the frontend
    #initConfig(config: GameConfig): void {
        this.#config = config;
        this.#config.paddleConfig.size = {x: defaults.PADDLE_WIDTH, y: defaults.PADDLE_HEIGHT};
        this.#config.paddleConfig.friction = defaults.PADDLE_FRICTION;
        this.#config.ballConfig.size = {x: defaults.BALL_SIZE, y: defaults.BALL_SIZE};
        this.#config.courtSize = {x: defaults.COURT_WIDTH, y: defaults.COURT_HEIGHT};
    }

    #initStates(initialState: StateName):void {
        // Init the Base States
        this.#stateManager.registerState("PlayingState", PlayingState)
        this.#stateManager.registerState("ScoredState", ScoredState)
        this.#stateManager.registerState("GameOverState", GameOverState)
        this.#stateManager.registerState("GameStartState", GameStartState)

        this.#stateManager.transitionTo(initialState);
    }

    #initEntities():void {
        this.#entityManager.addPlayer(new Paddle(this.#config));
        this.#entityManager.addPlayer(new Paddle(this.#config));
        this.#entityManager.addBall(new Ball(this.#config));
    }

    input(p1?: PlayerInputs, p2?: PlayerInputs): void {
        this.#stateManager.handleInput(p1, p2);
    }

    // Moves the game one tick forwards
    tick(deltaTime: number): void {
        this.#stateManager.update(deltaTime)
    }

    getGameState(): GameState {
        const ball = this.getBall()
        const paddles = this.getPaddles()
        const context = this.getContext()
        const gameState: GameState = {
            name: this.#stateManager.getName(),
            ball: {
                x: ball.getPos().x,
                y: ball.getPos().y,
                vx: ball.getVelocity().x,
                vy: ball.getVelocity().y,
                width: ball.getHibox()!.width,
                height: ball.getHibox()!.height
            },
            paddles: [
                {x: paddles[0]!.getPos().x, y: paddles[0]!.getPos().y},
                {x: paddles[1]!.getPos().x, y: paddles[1]!.getPos().y}
            ],
            scores: context.playerScore,
            isPlaying: true,
            lastUpdate: Date.now()
        }
        return gameState
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