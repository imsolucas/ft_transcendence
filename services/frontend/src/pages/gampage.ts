class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private animationId: number | null
    private isRunning = false;

    constructor (canvas: HTMLCanvasElement)
    {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.fillWindow();
        this.initEvents();
    }

    private initEvents(): void {
        window.addEventListener('resize', () => {
            this.fillWindow();
        })
    }
 
    private fillWindow(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    private render(): void {
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(50, 50, 100, 100); // Example: red square
        
        // Add game text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Game Running!', 50, 200);
    }

    private tick(): void {

    }

    private loop () : void {
        if (!this.isRunning) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.render();
        this.tick();
        requestAnimationFrame(this.loop);
    }

    public start(): void {
        if (this.isRunning)
            return ;
        this.isRunning = true;
        this.loop();
    }

    public stop(): void {
        this.isRunning = false;
        if (this.animationId){
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}

let currentGame: Game | null = null;


export function GamePage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'w-full h-screen relative';
    
    const canvas = document.createElement('canvas');
    canvas.className = 'block';
    canvas.style.background = "#0000";

    container.appendChild(canvas);

    setTimeout(() => {
        currentGame = new Game(canvas);
        currentGame.start();
    }, 0);

    return container;
}

export function cleanupGamePage(): void {
    if (currentGame)
        currentGame.stop
}