import { GameEngine, type ConnectionErrorMessage, type ConnectionMessage, type GameConfig, type GameMessage, type JoinQueueMessage } from "shared/index";
import { GameClient } from "../game/GameClient"
import { navigate } from "../router";
import { LoadingPong } from "../components/loadingGame";
import type { MatchmakingEvents, PlayerInfo } from "../components/loadingGame";
import { getCurrentUser } from "../utils/auth-script";
import { gameStorage, type GameOptionsData } from "../types/game";

const user = await getCurrentUser();

let gameOptions: GameOptionsData | null = null;
let currentGame: GameClient | null = null;

function onlineGame(canvas: HTMLCanvasElement, onGameOver: () => void) {
    const socket = new WebSocket('ws://localhost:3001/ws/game');
    const events: MatchmakingEvents = {
        onMatchFound: (opponent: PlayerInfo, matchId: string) =>{},
        onMatchReady: (matchId: string) => {

        },
        onMatchError: (matchId: string) => {

        },
        onCancel: () => {
            navigate('lobby');
        }
    }

    const loadingComponent = LoadingPong(events);


    socket.onopen = () => {
        const connectionMsg: ConnectionMessage = {
            type: 'connection',
            data: {playerName: user!.username},
            timestamp: Date.now()
        }

        socket.send(JSON.stringify(connectionMsg));
    }

    socket.onmessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data) as GameMessage;

        switch (message.type) {
            case 'connectionSuccess':
                console.log('Successfully connected to server')
                break;
            case 'connectionError':
                const errorMsg = message as ConnectionErrorMessage
                alert(`Error from server: ${message.data.message}`);
                console.log("Error froms server:", errorMsg.data.message);
                navigate('lobby');
                break;
            case 'gameStart':
                if (loadingComponent)
                    loadingComponent.remove();
                canvas.style.display = 'block';
                currentGame = new GameClient(canvas, gameOptions!.config!, socket, onGameOver);
                currentGame.start()
                break;
            case 'playerJoined':
                break;
            default:
                console.log("Unexpected message from server: ", message);
                break
        }
    }

    switch (gameOptions?.type) {
        case 'create-room':
            const createRoomMsg: JoinQueueMessage = {
                type: 'joinQueue',
                data: {
                    config: gameOptions.config,
                    roomType: gameOptions.config!.mode
                },
                timestamp: Date.now()
            }
            socket.send(JSON.stringify(createRoomMsg));
            break;
        case 'join-room':
            const joinRoomMsg: JoinQueueMessage = {
                type: 'joinQueue',
                data: {
                    roomType: gameOptions.config?.mode!,
                    roomId: gameOptions.roomId
                },
                timestamp: Date.now()
            }
            socket.send(JSON.stringify(joinRoomMsg));
            break;
        case 'random':
            const JoinQueueMsg: JoinQueueMessage = {
                type: 'joinQueue',
                data: {
                    roomType: gameOptions.config?.mode!  
                },
                timestamp: Date.now()
            }
            socket.send(JSON.stringify(JoinQueueMsg));
            break;
        default:
            // alert(`Invalid online game Type ${gameOptions?.type}`);
            console.log('Invalid online game Type: ', gameOptions?.type);
            navigate('lobby');
            break;
    }
}

function localGame(canvas: HTMLCanvasElement, onGameOver: () => void) {
    canvas.style.display = 'block';
    setTimeout(() => {
        currentGame = new GameClient(canvas, gameOptions!.config!, undefined, onGameOver);
        currentGame.start()
    }, 0);
}

export function GamePage(): HTMLElement {
    gameOptions = gameStorage.getGameOptions();

    if (!user || !gameOptions)
        navigate('lobby');

    const container = document.createElement('div');
    container.className = 'flex inset overflow-hidden items-center justify-center';

    const canvas = document.createElement('canvas');
    canvas.className = '';
    canvas.style.display = 'none';
    canvas.style.background = "#000000";
    canvas.style.borderRadius = "25px"

    container.appendChild(canvas);

    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    const onGameOver = () => {
        if (gameOptions?.config!.mode == 'standard'){
            setTimeout(() => {
                navigate('lobby');
            }, 3 * 1000)
        }
    }

    if (gameOptions?.type == 'local')
        localGame(canvas, onGameOver);
    else
        onlineGame(canvas, onGameOver);

    return container;
}

export function cleanupGamePage(): void {
    gameStorage.clearGameOptions();
    currentGame?.stop;
    document.body.style.overflow = '';
    document.body.style.margin = '';
    document.body.style.padding = '';
}