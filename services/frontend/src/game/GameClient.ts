import { GameEngine } from "shared"
import type { ConnectionMessage, GameConfig, GameEndMessage, GameMessage, GameState, GameStateMessage, PlayerInputMessage, PlayerInputs, serializablePlayer, TournamentState, TournamentStateMessage } from "shared";
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
    private winner?: serializablePlayer
    private socket?: WebSocket
    private scale_x: number = 0
    private scale_y: number = 0
    private aspectRatio!: number
    onGameOver?: () => void

    private resizeHandler: () => void;
    private keydownHandler: (ev: KeyboardEvent) => void;
    private keyupHandler: (ev: KeyboardEvent) => void;

    constructor (canvas: HTMLCanvasElement, config: GameConfig, socket?: WebSocket, onGameOver?: () => void, tournamentState?: TournamentState)
    {
        this.onGameOver = onGameOver;
        this.socket = socket
        this.tournamentState = tournamentState;
        if (!socket)
            this.gameEngine = new GameEngine(config);
        this.config = config;
        this.aspectRatio = config.courtSize!.x / config.courtSize!.y
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        const inputs: PlayerInputs = {up: false, down: false, left: false, right: false, action_1: false, action_2: false}
        this.playerInputs = [{...inputs}, {...inputs}]
        
        this.resizeHandler = () => {
            this.fillWindow();
            cancelAnimationFrame(this.animationId!);
        };
        this.keydownHandler = (ev: KeyboardEvent) => this.handleKeyInput(ev, true);
        this.keyupHandler = (ev: KeyboardEvent) => this.handleKeyInput(ev, false);
        
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
        // 🧹 Remove event listeners
        this.removeEvents();
    }

    private initSocket(): void {
        this.socket!.onmessage = (event: MessageEvent) => {
            const message: GameMessage = (JSON.parse(event.data.toString())) as GameMessage;

            switch (message.type) {
                case 'gameState':
                    const gameStateMessage = (message as GameStateMessage)
                    this.gameState = gameStateMessage.data.gameState
                    console.log("Recieved game state");
                    break;
                case 'tournamentState':
                    const tournamentStateMsg = message as TournamentStateMessage
                    this.tournamentState = tournamentStateMsg.data.state;
                    console.log('Recieved Tournament state');
                    break;
                case 'playerLeft':
                    alert("Opponent left");
                    this.onGameOver?.();
                    break;
                case 'gameEnd':
                    const gameEndMsg = message as GameEndMessage

                    this.winner = gameEndMsg.data.winner

                    console.log(`Game Over, player ${this.winner.name} has won`);
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
        window.addEventListener('resize', this.resizeHandler);
        document.addEventListener("keydown", this.keydownHandler);
        document.addEventListener("keyup", this.keyupHandler);
    }

    private removeEvents(): void {
        window.removeEventListener('resize', this.resizeHandler);
        document.removeEventListener("keydown", this.keydownHandler);
        document.removeEventListener("keyup", this.keyupHandler);
    }

    private fillWindow(): void {
        const canvasContainer = document.getElementById('canvas-container') as HTMLDivElement;
        
        if (!canvasContainer) {
            console.warn('Canvas container not found, stopping game');
            this.stop();
            return;
        }
        
        // Get the available space from the container
        const containerRect = canvasContainer.getBoundingClientRect();
        const availableWidth = containerRect.width;
        const availableHeight = containerRect.height;
    
        let newWidth = availableWidth;
        let newHeight = availableHeight;
        let containerAspect = availableWidth / availableHeight;
    
        // Fit canvas to container while maintaining aspect ratio
        if (containerAspect > this.aspectRatio) {
            // Container is wider than needed, constrain by height
            newWidth = availableHeight * this.aspectRatio;
            newHeight = availableHeight;
        } else {
            // Container is taller than needed, constrain by width
            newHeight = availableWidth / this.aspectRatio;
            newWidth = availableWidth;
        }
    
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this.scale_x = this.canvas.width / this.config!.courtSize!.x;
        this.scale_y = this.canvas.height / this.config!.courtSize!.y;
    }

    private render_tournament_state(): void {
        if (!this.tournamentState) return;

        // Update player names in the header
        const leftPlayerContainer = document.getElementById('left-player-name');
        const rightPlayerContainer = document.getElementById('right-player-name');
        
        if (leftPlayerContainer && this.tournamentState.kingName) {
            const leftPlayerNameSpan = leftPlayerContainer.querySelector('span');
            if (leftPlayerNameSpan) {
                leftPlayerNameSpan.textContent = this.tournamentState.kingName;
            }
        }
        
        if (rightPlayerContainer && this.tournamentState.challengerName) {
            const rightPlayerNameSpan = rightPlayerContainer.querySelector('span');
            if (rightPlayerNameSpan) {
                rightPlayerNameSpan.textContent = this.tournamentState.challengerName;
            }
        }

        // Update the queue
        const queue = document.getElementById('queue');
        if (!queue) return;

        // Clear current queue
        queue.innerHTML = '';

        // Populate queue with waiting players
        if (this.tournamentState.queue && this.tournamentState.queue.length > 0) {
            this.tournamentState.queue.forEach(player => {
                const playerContainer = document.createElement('div');
                playerContainer.className = 'flex items-center justify-center gap-3 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full px-6 py-3 min-w-0 w-full';
                
                const playerName = document.createElement('span');
                playerName.className = 'text-gray-900 font-bold text-lg truncate';
                playerName.textContent = player.playerName;
                
                playerContainer.appendChild(playerName);
                queue.appendChild(playerContainer);
            });
        }
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

        if (this.gameState.name == "GameOverState" || this.winner){
            let winner: string;

            if (this.winner)
                winner = this.winner.name;
            else
                winner = this.gameState.scores[0] > this.gameState.scores[1] ? this.config.playerNames[0] : this.config.playerNames[1]
            drawString(
                `${winner} has won!`,
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
        if (this.tournamentState)
            this.render_tournament_state();
        if (this.gameState?.name == 'GameOverState'){
            this.onGameOver?.();
        }
        requestAnimationFrame(this.loop.bind(this));
    }
}