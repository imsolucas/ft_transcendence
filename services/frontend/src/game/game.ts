import Player from "./entities/player";
import { __speed__, PLAYER_WIDTH} from "./definitions";
import Ball from "./entities/ball";

export class Game {
    #canvas: HTMLCanvasElement;
    #ctx: CanvasRenderingContext2D;
    #animationId: number | null
    #isRunning = false;
    #previousTime: number;
    #player1 = new Player ({x: 50,y: 200}, "#ffffff");
    #player2 = new Player ({x: 1000,y: 200}, "#ffffff");
    #keys = {
        w: false,
        s: false,
        up: false,
        down: false
    }

    constructor (canvas: HTMLCanvasElement)
    {  
        this.#previousTime = 0;
        this.#animationId = null;
        this.#canvas = canvas;
        this.#ctx = canvas.getContext('2d')!;
        this.#fillWindow();
        this.#initEvents();
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
    }

    #tick(deltaTime: number): void {
        this.#player1.key(this.#keys.w, this.#keys.s);
        this.#player1.tick(deltaTime, this.#canvas);

        this.#player2.key(this.#keys.up, this.#keys.down);
        this.#player2.tick(deltaTime, this.#canvas);
    }

    #loop (timestamp: number) : void {
        if (!this.#isRunning) return;
        // Calulate deltaTime
        let deltaTime = timestamp - this.#previousTime;
        this.#previousTime = timestamp;
        // Clear screen
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        this.#tick(deltaTime);
        this.#render();
        this.#tick();
        requestAnimationFrame(this.#loop.bind(this));
    }
}