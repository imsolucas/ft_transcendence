import Player from "./entities/Player";
import SquareBall from "./entities/SquareBall";
import EntityManager from "./EntityManager";
import { constants, eGameState} from "./definitions";
import { StateManager } from "./StateManager";
import PlayingState from "./states/PlayingState";
import type { GameContext } from "./states/GameState";
import PausedState from "./states/PausedState";
import ScoredState from "./states/ScoredState";
import { classicPongUi } from "./utils/drawUtils";
import GameOverState from "./states/GameOverState";
import GameStartState from "./states/GameStartState";

export class Game {
    #context: GameContext;
    #canvas: HTMLCanvasElement;
    #ctx: CanvasRenderingContext2D;
    #entityManager: EntityManager = new EntityManager;
    #stateManager: StateManager;
    #animationId: number | null = null;
    #isRunning = false;
    #previousTime: number = 0;
    #playerScores: number[] = []

    constructor (canvas: HTMLCanvasElement)
    {  
        this.#canvas = canvas;
        this.#ctx = canvas.getContext('2d')!;
        this.#playerScores[0] = 0;
        this.#playerScores[1] = 0;
        this.#context = {
            canvas: canvas,
            ctx: this.#ctx,
            entityManager: this.#entityManager,
            playerScore: this.#playerScores,
            currentUi: classicPongUi,
        }
        this.#stateManager = new StateManager(this.#context);
        this.#fillWindow();
        this.#initEvents();
        this.#initEntities();
        this.#initStates();
    }

    public start(): void {
        if (this.#isRunning)
            return ;
        this.#isRunning = true;
        this.#loop(0);
    }

    public stop(): void {
        this.#isRunning = false;
        if (this.#animationId){
            cancelAnimationFrame(this.#animationId);
            this.#animationId = null;
        }
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
        this.#entityManager.addPlayer(new Player("#ffffff"));
        this.#entityManager.addPlayer(new Player("#ffffff"));
        this.#entityManager.addSquareBall(new SquareBall("#ffffff"));
    }

    #initEvents(): void {
        window.addEventListener('resize', () => {
            this.#fillWindow();
            cancelAnimationFrame(this.#animationId!);
        })
        document.addEventListener("keydown", (ev) => this.#handleKeyInput(ev, true));
        document.addEventListener("keyup", (ev) => this.#handleKeyInput(ev, false));
    }
    
    #handleKeyInput(event: KeyboardEvent, keyDown: boolean): void {
        this.#stateManager.handleInput(event, keyDown);
    }   

    #fillWindow(): void {
        const navbar = document.querySelector('nav');
        const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
        
        this.#canvas.width = window.innerWidth;
        this.#canvas.height = window.innerHeight - navbarHeight;

        constants.SCALE_X = this.#canvas.width / constants.COURT_WIDTH;
        constants.SCALE_Y = this.#canvas.height / constants.COURT_HEIGHT;
        
        this.#canvas.style.marginTop = `${navbarHeight}px`;
    }

    #loop (timestamp: number) : void {
        if (!this.#isRunning) 
            return;
        let deltaTime = (timestamp - this.#previousTime) / 1000 ;
        this.#previousTime = timestamp;
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
        this.#stateManager.update(deltaTime);
        this.#stateManager.render(this.#ctx);
        requestAnimationFrame(this.#loop.bind(this));
    }
}