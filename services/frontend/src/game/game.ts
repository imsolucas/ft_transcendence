import Player from "./entities/player";
import { PLAYER_HEIGHT, PLAYER_WIDTH, type Vector} from "./definitions";
import Ball from "./entities/ball";
import type Entity from "./entities/entity";

export class Game {
    #canvas: HTMLCanvasElement;
    #ctx: CanvasRenderingContext2D;
    #entityManager: EntityManager = new EntityManager;
    #animationId: number | null = null;
    #isRunning = false;
    #previousTime: number = 0;
    #keys = {
        w: false,
        s: false,
        up: false,
        down: false
    }

    constructor (canvas: HTMLCanvasElement)
    {  
        this.#canvas = canvas;
        this.#ctx = canvas.getContext('2d')!;
        this.#fillWindow();
        this.#initEvents();
        this.#initEntities();
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

    #initEntities():void {

        this.#entityManager.newPlayer({x: 50,y: this.#canvas.height / 2 - PLAYER_HEIGHT / 2}, "#ffffff");
        this.#entityManager.newPlayer({x: this.#canvas.width - PLAYER_WIDTH - 50,y: this.#canvas.height / 2 - PLAYER_HEIGHT / 2}, "#ffffff");
        this.#entityManager.newBall({x: this.#canvas.width / 2, y: this.#canvas.height / 2}, "#ffffff");
    }

    #initEvents(): void {
        window.addEventListener('resize', () => {
            this.#fillWindow();
            cancelAnimationFrame(this.#animationId!);
        })
        document.addEventListener("keydown", (ev) => this.#handleKeyInput(ev, true));
        document.addEventListener("keyup", (ev) => this.#handleKeyInput(ev, false));
    }
    
    #handleKeyInput(ev: KeyboardEvent, keyDown: boolean): void {
        switch(ev.key){
            case ("w"):
                this.#keys.w = keyDown;
                break;
            case("s"):
                this.#keys.s = keyDown;
                break;
            case("ArrowDown"):
                this.#keys.down = keyDown;
                break;
            case("ArrowUp"):
                this.#keys.up = keyDown;
                break;
            default:
                break;
        }
    }   

    #fillWindow(): void {
        const navbar = document.querySelector('nav');
        const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
        
        this.#canvas.width = window.innerWidth;
        this.#canvas.height = window.innerHeight - navbarHeight;
        
        this.#canvas.style.marginTop = `${navbarHeight}px`;
    }

    #render(): void {
        this.#entityManager.drawEntities(this.#ctx);
    }

    #tick(deltaTime: number): void {
        this.#entityManager.tickEntities(deltaTime, this.#canvas);
        this.#entityManager.playerInputs(this.#keys);
    }

    #loop (timestamp: number) : void {
        if (!this.#isRunning) 
            return;
        let deltaTime = timestamp - this.#previousTime;
        this.#previousTime = timestamp;
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        this.#tick(deltaTime);
        this.#render();
        requestAnimationFrame(this.#loop.bind(this));
    }
}

class EntityManager {
    #entities: Entity[] = []
    #players: Player[] = []
    #balls: Ball[] = []

    constructor() {}

    playerInputs(keys: {w: boolean, s: boolean, up: boolean, down: boolean}):void {
        this.#players[0].input(keys.w, keys.s);
        this.#players[1].input(keys.up, keys.down);
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

    addBall(ball: Ball): void {
        this.#entities.push(ball);
        this.#balls.push(ball);
    }

    newPlayer(pos: Vector, color: string, size?: Vector): void {
        var player = new Player(pos, color, size);

        this.#entities.push(player);
        this.#players.push(player);
    }

    newBall(pos: Vector, color: string, radius ? : number ): void {
        const ball = new Ball(pos, color, radius);

        this.#entities.push(ball);
        this.#balls.push(ball);
    }

    removePlayer(index: number): void {
        this.#players.splice(index, 1);
    }

    removeBall(index: number): void {
        this.#balls.splice(index, 1);
    }

}