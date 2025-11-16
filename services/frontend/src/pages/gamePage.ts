import type { GameConfig } from "shared/index";
import { GameClient } from "../game/GameClient"
import { socket } from "./lobbyPage";
import { default_config } from "shared";
import { navigate } from "../router";

let currentGame: GameClient | null = null;

export function GamePage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex inset overflow-hidden items-center justify-center';

    // const navbar = document.querySelector('nav')
    // const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;

    const config: GameConfig = default_config.standardGame

    const canvas = document.createElement('canvas');
    canvas.className = '';
    canvas.style.background = "#000000";

    container.appendChild(canvas);

    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    const onGameOver = () => {
        if (config.mode == 'standard'){
            setTimeout(() => {
                navigate('lobby');
            }, 3 * 1000)
        }
    }

    setTimeout(() => {
        currentGame = new GameClient(canvas, config, socket, onGameOver);
        currentGame.start()
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