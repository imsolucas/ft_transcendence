import { GameEngine } from "shared"
import type { GameConfig, GameEndMessage, GameMessage, GameState, GameStateMessage, PlayerInputMessage, PlayerInputs, PlayerLeftMessage, serializablePlayer, TournamentEndMessage, TournamentRoundEndMessage, TournamentState, TournamentStateMessage } from "shared";
import { drawCircle, drawRectangle, drawRoundRect, drawString, drawWrappedString } from "./utils/drawUtils";

export class GameClient {
    private ctx: CanvasRenderingContext2D;
    private animationId: number | null = null;
    private isRunning = false;
    private previousTime: number = performance.now();
    private playerInputs: PlayerInputs[]
    private gameEngine?: GameEngine;
    private gameState!: GameState;
    private winner?: serializablePlayer
    private roundWinner?: serializablePlayer
    private tournamentWinner?: serializablePlayer
    private scale_x: number = 0
    private scale_y: number = 0
    private aspectRatio!: number

    private resizeHandler: () => void;
    private keydownHandler: (ev: KeyboardEvent) => void;
    private keyupHandler: (ev: KeyboardEvent) => void;

    constructor (
        private canvas: HTMLCanvasElement,
        private config: GameConfig,
        private onGameOver: (error?: string) => void,
        private socket?: WebSocket,
        private currentUserName?: string,
        private tournamentState?: TournamentState,
        private playersInRoom?: serializablePlayer[]
    )
    {
        if (!socket)
            this.gameEngine = new GameEngine(config);
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
        if (this.socket){
            this.socket.onclose = null
            this.socket.onmessage = null
            this.socket.close()
        }
        if (this.animationId){
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.removeEvents();
    }

    private initSocket(): void {
        this.socket!.onmessage = (event: MessageEvent) => {
            const message: GameMessage = (JSON.parse(event.data.toString())) as GameMessage;

            switch (message.type) {
                case 'gameState':
                    this.winner = undefined;
                    this.roundWinner = undefined;
                    const gameStateMessage = (message as GameStateMessage)
                    this.gameState = gameStateMessage.data.gameState
                    console.log("Recieved game state");
                    break;
                case 'tournamentState':
                    const tournamentStateMsg = message as TournamentStateMessage
                    this.tournamentState = tournamentStateMsg.data.state;
                    console.log('Recieved Tournament state');
                    break;
                case 'tournamentRoundEnd':
                    const tournamentRoundEndMsg = message as TournamentRoundEndMessage

                    this.roundWinner = tournamentRoundEndMsg.data.winner
                    break;
                case 'playerLeft':
                    const playerLeftMsg = message as PlayerLeftMessage

                    if (this.winner || this.roundWinner || this.gameState.name == 'GameOverState')
                        break;
                    this.stop();
                    this.onGameOver(`Opponent ${playerLeftMsg.data.playerName} left`);
                    break;
                case 'gameEnd':
                    const gameEndMsg = message as GameEndMessage

                    this.winner = gameEndMsg.data.winner

                    console.log(`Game Over, player ${this.winner.name} has won`);
                    break;
                case 'tournamentEnd':
                    const tournamentEndMsg = message as TournamentEndMessage

                    this.tournamentWinner = tournamentEndMsg.data.winner;
                    break;
                default:
                    break;
            }
        }
        this.socket!.onclose = () => {
            this.stop();
            this.onGameOver?.('Lost connection to server');
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


        const updatePlayerContainer = (containerId: string, playerName: string, picture?: string) => {
            const playerContainer = document.getElementById(containerId) as HTMLDivElement;

            if (!playerContainer){
                console.warn('could not find player container with id: ', containerId);
                return ;
            }

            const name = playerContainer.querySelectorAll('span')[0] as HTMLSpanElement;
            const score = playerContainer.querySelectorAll('span')[1] as HTMLSpanElement;
            const img = playerContainer.querySelector('img') as HTMLImageElement;

            if (name)
                name.textContent = playerName

            if (img){
                if (!picture)
                    picture = this.playersInRoom!.find(player => { if (player.name == playerName) return player })?.picture
                img.src = picture ? picture : '';
            }

            if (score){
                score.textContent = (this.tournamentState!.scores as Record<string, number>)[playerName].toString();
            }
        }

        updatePlayerContainer('left-player-container', this.tournamentState.kingName);
        updatePlayerContainer('right-player-container', this.tournamentState.challengerName);

        // Update the queue
        const queue = document.getElementById('queue');
        if (!queue) return;

        // Clear current queue
        queue.innerHTML = '';

        // Populate queue with waiting players
        if (this.tournamentState.queue && this.tournamentState.queue.length > 0) {
            this.tournamentState.queue.forEach(player => {
                const playerContainer = document.createElement('div');
                playerContainer.className = `flex items-center justify-center gap-3 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full px-6 py-3 min-w-0 w-full`;

                const playerName = document.createElement('span');
                playerName.className = 'text-gray-900 font-bold text-lg truncate';

                const playerScore = document.createElement('span');
                playerScore.className = 'text-gray-900 font-bold text-lg';

                playerScore.textContent = (this.tournamentState!.scores as Record<string, number>)[player.playerName].toString();
                console.log("Tourney score: ", this.tournamentState!.scores);
                playerName.textContent = player.playerName;
                
                playerContainer.appendChild(playerName);
                playerContainer.appendChild(playerScore);
                queue.appendChild(playerContainer);
            });
        }
    
        this.tournamentState = undefined
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

        let winner: string | undefined = undefined
        if (this.socket){
            if (this.winner){
                winner = this.winner.name;
            }
            if (this.roundWinner){
                winner = this.roundWinner.name;
            }
            if (this.tournamentWinner)
                winner = this.tournamentWinner.name;
        }
        else if (this.gameState.name == "GameOverState"){
            winner = this.gameState.scores[0] > this.gameState.scores[1] ? this.config.playerNames[0] : this.config.playerNames[1];
        }
        if (winner){
            const message = `${winner} has won${this.tournamentWinner ? ' the tournament' : ''}!`;
            drawWrappedString(
                message,
                {x: this.config.courtSize!.x / 2, y: this.config.courtSize!.y / 2},
                "#8f40de",
                "bold 50px Poppins",
                this.config.courtSize!.x * 0.8, // Max width (80% of court width)
                20, // Line height
                {x: this.scale_x, y: this.scale_y},
                this.ctx
            );
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
        if ((this.gameState?.name == 'GameOverState' && !this.socket) || this.winner || this.tournamentWinner){
            this.onGameOver()
        }
        requestAnimationFrame(this.loop.bind(this));
    }
}