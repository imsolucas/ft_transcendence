import { GameEngine } from "shared"
import type { ConnectionMessage, GameConfig, GameMessage, GameState, GameStateMessage, PlayerInputMessage, PlayerInputs, TournamentState } from "shared";
import { drawCircle, drawRectangle, drawRoundRect, drawString } from "./utils/drawUtils";

export class GameClient {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private animationId: number | null = null;
    private isRunning = false;
    private previousTime: number = performance.now();
    private playerInputs: PlayerInputs[]
    private gameEngine?: GameEngine;
    private gameState!: GameState;
    private tournamentState?: TournamentState;
    private config: GameConfig;
    private socket?: WebSocket
    private scale_x: number = 0
    private scale_y: number = 0
    private aspectRatio!: number
    onGameOver?: () => void

    constructor (canvas: HTMLCanvasElement, config: GameConfig, socket?: WebSocket, onGameOver?: () => void)
    {
        this.onGameOver = onGameOver;
        this.socket = socket
        this.gameEngine = new GameEngine(config);
        this.config = config;
        this.aspectRatio = config.courtSize!.x / config.courtSize!.y
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        const inputs: PlayerInputs = {up: false, down: false, left: false, right: false, action_1: false, action_2: false}
        this.playerInputs = [{...inputs}, {...inputs}]
        if (this.socket)
            this.initSocket();
        this.fillWindow();
        this.initEvents();
    }

    public start(): void {
        if (this.isRunning)
            return ;
        this.isRunning = true;
        this.loop(0);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.animationId){
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    private initSocket(): void {
        this.socket!.onopen = () => {
            const message: ConnectionMessage = {
                type: 'connection',
                data: { playerName: 'test'},
                timestamp: Date.now()
            }
            this.socket!.send(JSON.stringify(message));
        }

        this.socket!.onmessage = (event: MessageEvent) => {
            const message: GameMessage = (JSON.parse(event.data.toString())) as GameMessage;

            switch (message.type) {
                case 'gameState':
                    const gameStateMessage = (message as GameStateMessage)
                    this.gameState = gameStateMessage.data.gameState
                    console.log("Recieved game state", this.gameState);
                    break;
                case 'playerLeft':
                    this.onGameOver?.();
                    break;
                default:
                    break;
            }
        }

        this.socket!.onclose = () => {
            this.onGameOver?.();
        }
    }

    private handleKeyInput(ev: KeyboardEvent, keydown: boolean) {

        switch (ev.key){
            case 'w':
                this.playerInputs[0].up = keydown;
                break;
            case 's':
                this.playerInputs[0].down = keydown;
                break;
            case ' ':
                this.playerInputs[0].action_1 = keydown;
        }

        if (this.socket) { //TODO handle socket
            const message: PlayerInputMessage = {
                type: 'playerInput',
                data: { inputs: this.playerInputs[0] },
                timestamp: Date.now()
            }
            this.socket.send(JSON.stringify(message))
            return;
        }

        switch (ev.key){
            case 'ArrowUp':
                this.playerInputs[1].up = keydown;
                break;
            case 'ArrowDown':
                this.playerInputs[1].down = keydown;
                break;
            case 'Control':
                this.playerInputs[1].action_1 = keydown;
        }

        this.gameEngine?.input(this.playerInputs[0], this.playerInputs[1]);
    }

    private initEvents(): void {
        window.addEventListener('resize', () => {
            this.fillWindow();
            cancelAnimationFrame(this.animationId!);
        })
        document.addEventListener("keydown", (ev) => this.handleKeyInput(ev, true));
        document.addEventListener("keyup", (ev) => this.handleKeyInput(ev, false));
    }

    private fillWindow(): void {
        const navbar = document.querySelector('nav');
        const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
        
        let newWidth = window.innerWidth;
        let newHeight = window.innerHeight - navbarHeight;
        let newAspect = newWidth / newHeight;
      
        if (newAspect > this.aspectRatio)
        {
            newWidth = newHeight * this.aspectRatio;
            this.canvas.height = newHeight;
            this.canvas.width = newWidth;
        }
        else
        {
            newHeight = newWidth / this.aspectRatio;
            this.canvas.height = newHeight;
            this.canvas.width = newWidth;
        }
      
        this.scale_x = this.canvas.width / this.config.courtSize!.x;
        this.scale_y = this.canvas.height / this.config.courtSize!.y;
        
        this.canvas.style.marginTop = `${navbarHeight}px`;
    }

    private render_game_state(): void {
        drawCircle(
            {x: this.gameState.ball.x, y: this.gameState.ball.y},
            this.config.ballConfig.size!.y / 2,
            this.config.ballConfig.color,
            {x: this.scale_x, y: this.scale_y},
            this.ctx
        )

        // drawRectangle(
        //     {x: this.gameState.ball.x, y: this.gameState.ball.y},
        //     this.config.ballConfig.size!,
        //     this.config.ballConfig.color,
        //     {x: this.scale_x, y: this.scale_y},
        //     this.ctx
        // )

        for (const paddle of this.gameState.paddles){
            drawRoundRect(
                {x: paddle.x, y: paddle.y},
                this.config.paddleConfig.size!,
                1,
                this.config.paddleConfig.color,
                {x: this.scale_x, y: this.scale_y},
                this.ctx
            )
        }

        if (this.gameState.name == "GameOverState"){
            const winner: string = this.gameState.scores[0] > this.gameState.scores[1] ? "1" : "2"; 
            drawString(
                `Player ${winner} has won!`,
                {x: this.config.courtSize!.x / 2, y: this.config.courtSize!.y / 2},
                "#8f40de", "bold 16px Poppins",
                {x: this.scale_x, y: this.scale_y}, this.ctx);
        }
    }

    private render_ui(): void {
            drawRectangle(
                {x: this.config.courtSize!.x / 2, y: this.config.courtSize!.y / 2},
                {x: this.config.courtSize!.x / 50, y: this.config.courtSize!.y},
                "#9da1a3",
                {x: this.scale_x, y: this.scale_y},
                this.ctx
            )
            drawString(this.gameState.scores[0].toString(), {x: this.config.courtSize!.x / 2 - 10, y: 15}, "white","bold 16px Poppins", {x: this.scale_x, y: this.scale_y} ,this.ctx);
            drawString(this.gameState.scores[1].toString(), {x: this.config.courtSize!.x / 2 + 10, y: 15}, "white","bold 16px Poppins", {x: this.scale_x, y: this.scale_y} ,this.ctx);
    }

    private loop (timestamp: number) : void {
        if (!this.isRunning) 
            return;
        let deltaTime = (timestamp - this.previousTime) / 1000 ;
        this.previousTime = timestamp;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.socket) {
            this.gameEngine!.tick(deltaTime);
            this.gameState = this.gameEngine!.getGameState()
        }
        if (this.gameState){
            this.render_ui();
            this.render_game_state();
        }
        if (this.gameState?.name == 'GameOverState'){
            this.onGameOver?.();
            return ;
        }
        requestAnimationFrame(this.loop.bind(this));
    }
}