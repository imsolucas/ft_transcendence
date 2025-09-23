import Player from "./entities/player";
import { PLAYER_SPEED, PLAYER_WIDTH, type Vector} from "./definitions";
import Ball from "./entities/ball";
import type Entity from "./entities/entity";

export class Game {
    #canvas: HTMLCanvasElement;
    #ctx: CanvasRenderingContext2D;
    #player1!: Player;
    #player2!: Player;
    #ball!: Ball;
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

        this.#entityManager.newPlayer(new Player ({x: 50,y: 200}, "#ffffff"));
        this.#entities.push(new Player ({x: this.#canvas.width - PLAYER_WIDTH - 50,y: 200}, "#ffffff"));
        this.#balls.push(new Ball({x: this.#canvas.width / 2, y: this.#canvas.height / 2}, "#ffffff"));
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
        this.#player1.draw(this.#ctx);
        this.#player2.draw(this.#ctx);
        this.#ball.draw(this.#ctx);
    }

    #tick(deltaTime: number): void {
        this.#player1.key(this.#keys.w, this.#keys.s);
        this.#player1.tick(deltaTime, this.#canvas);

        this.#player2.key(this.#keys.up, this.#keys.down);
        this.#player2.tick(deltaTime, this.#canvas);

        this.#ball.tick(deltaTime, this.#canvas);
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

    newPlayer(player: Player): void;
    newPlayer(test: Player, pos?: Vector, color?: string, size?: Vector): void {
        if (player === undefined)
            var newPlayer = new Player(pos, color, size);

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