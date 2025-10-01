import Player from "./entities/Player";
import SquareBall from "./entities/SquareBall";
import EntityManager from "./EntityManager";
import { constants, eGameState} from "./definitions";
import { drawRectangle } from "./utils/drawUtils";

export class Game {
    #canvas: HTMLCanvasElement;
    #ctx: CanvasRenderingContext2D;
    #entityManager: EntityManager = new EntityManager;
    #animationId: number | null = null;
    #isRunning = false;
    #previousTime: number = 0;
    #state: number = eGameState.START_ROUND
    #waitFrames: number = 0;
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
    
    #handleKeyInput(ev: KeyboardEvent, keyDown: boolean): void {
        // if (this.#state == eGameState.PAUSE)
        //     this.#state = eGameState.PLAYING
        if (this.#state != eGameState.PLAYING)
            return ;
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
            // case("Escape"):
            //     this.#state = eGameState.PAUSE
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
        this.#drawUi();
    }

    #drawUi(): void {
        const line_size = this.#canvas.height / constants.BALL_SIZE;
        let i = 0;
        
        while (i < line_size)
        {
            if (i % 2 == 0  )
                drawRectangle({x: this.#canvas.width / 2, y: i * constants.BALL_SIZE}, {x: constants.BALL_SIZE, y:constants.BALL_SIZE}, "white", this.#ctx);
            i++;
        }
    }

    #tick(deltaTime: number): void {
        this.#entityManager.tickEntities(deltaTime, this.#canvas);
        this.#entityManager.checkCollisions();
    }

    #resetPos(): void {
        this.#entityManager.getPlayer(0).setPos({
            x: 50,
            y: this.#canvas.height / 2 - constants.PLAYER_HEIGHT / 2
        })
        this.#entityManager.getPlayer(1).setPos({
            x: this.#canvas.width - constants.PLAYER_WIDTH - 50,
            y: this.#canvas.height / 2 - constants.PLAYER_HEIGHT / 2
        })
        this.#entityManager.getSquareBall().reset(this.#canvas)
    }

    #loop (timestamp: number) : void {
        if (!this.#isRunning) 
            return;
        let deltaTime = timestamp - this.#previousTime;
        this.#previousTime = timestamp;
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

        switch (this.#state){
            case (eGameState.START_ROUND):
                this.#resetPos();
                this.#state = eGameState.STARTING_ROUND
                break;
            case (eGameState.STARTING_ROUND):
                if (this.#waitFrames != 60)
                    this.#waitFrames++;
                else{
                    this.#waitFrames = 0
                    this.#state = eGameState.PLAYING
                    this.#entityManager.getSquareBall().randomVelocity();
                }
                break;
        }
        this.#tick(deltaTime);
        this.#entityManager.playerInputs(this.#keys);
        this.#render();
        requestAnimationFrame(this.#loop.bind(this));
    }
}