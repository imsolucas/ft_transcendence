import { Game } from "../game/Game"

let currentGame: Game | null = null;


export function GamePage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'fixed inset-0 overflow-hidden';

    // const navbar = document.querySelector('nav')
    // const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;

    const canvas = document.createElement('canvas');
    canvas.className = 'block w-full flex-1';
    canvas.style.background = "#000000";

    container.appendChild(canvas);

    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    setTimeout(() => {
        currentGame = new Game(canvas);
        currentGame.start();
    }, 0);

    return container;
}

export function cleanupGamePage(): void {
    if (currentGame)
        currentGame.stop;
    document.body.style.overflow = '';
    document.body.style.margin = '';
    document.body.style.padding = '';
}