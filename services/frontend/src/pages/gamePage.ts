import { default_config, type ConnectionErrorMessage, type ConnectionMessage, type GameMessage, type JoinQueueMessage, type PlayerJoinedMessage, type PlayerLeftMessage, type PlayerReadyMessage } from "shared/index";
import { GameClient } from "../game/GameClient"
import { navigate } from "../router";
import { LoadingPong } from "../components/loadingGame";
import type { MatchmakingEvents, PlayerInfo } from "../components/loadingGame";
import { getCurrentUser } from "../utils/auth-script";
import { gameStorage, type GameOptionsData } from "../types/game";
import type { UserData } from "../types/user";
import { toggleNavbarVisibility } from "../components/Navbar";


let socket: WebSocket;
let user: UserData | null = null;
let gameOptions: GameOptionsData | null = null;
let currentGame: GameClient | null = null;

function matchMaking(container: HTMLElement, onGameOver: () => void) {

    const events: MatchmakingEvents = {
        onMatchFound: (opponent: PlayerInfo, matchId: string) =>{},
        onMatchReady: (matchId: string) => {
            const readyMsg: PlayerReadyMessage = {
                type: 'playerReady',
                data: {playerId: user!.id, playerName: user!.username, ready: true},
                timestamp: Date.now()
            };

            socket!.send(JSON.stringify(readyMsg));
        },
        onMatchError: (matchId: string) => {
            
        },
        onCancel: () => {
            navigate('lobby');
        }
    }

    const loadingComponent = LoadingPong(events);
    container.appendChild(loadingComponent);
    
    socket = new WebSocket('ws://localhost:3001/ws/game');
    socket.onopen = () => {
        const connectionMsg: ConnectionMessage = {
            type: 'connection',
            data: {playerName: user!.username},
            timestamp: Date.now()
        }

        socket!.send(JSON.stringify(connectionMsg));

    }

    socket.onerror = (ev: Event) => {
        console.log('Error connecting to server', ev);
        alert('Error connecting to server, try again later');
        navigate('lobby');
    }

    const onSuccessfulConnect = () => {
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
                socket!.send(JSON.stringify(createRoomMsg));
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
                socket!.send(JSON.stringify(joinRoomMsg));
                break;
            case 'random':
                const JoinQueueMsg: JoinQueueMessage = {
                    type: 'joinQueue',
                    data: {
                        roomType: gameOptions.config?.mode!  
                    },
                    timestamp: Date.now()
                }
                socket!.send(JSON.stringify(JoinQueueMsg));
                break;
            default:
                // alert(`Invalid online game Type ${gameOptions?.type}`);
                console.log('Invalid online game Type: ', gameOptions?.type);
                navigate('lobby');
                break;
        }
    }

    socket.onmessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data) as GameMessage;

        switch (message.type) {
            case 'connectionSuccess':
                console.log('Successfully connected to server')
                onSuccessfulConnect();
                break;
            case 'connectionError':
                const errorMsg = message as ConnectionErrorMessage
                alert(`Error from server: ${message.data.message}`);
                console.log("Error from server:", errorMsg.data.message);
                navigate('lobby');
                break;
            case 'playerJoined':
                const playerJoineMsg = message as PlayerJoinedMessage
                let player: PlayerInfo;

                gameOptions!.config = default_config.standardGame; //TODO backend will pass config
                playerJoineMsg.data.playersInRoom.forEach((val) => gameOptions!.config!.playerNames.push(val.name));
                if (playerJoineMsg.data.playerName == user!.username) {
                    console.log('Joined room with id: ', playerJoineMsg.data.roomId);
                    
                    if (playerJoineMsg.data.playersInRoom.length > 1){
                        player = {
                            id: playerJoineMsg.data.playersInRoom[0].id,
                            username: playerJoineMsg.data.playersInRoom[0].name
                        };
                        (loadingComponent as any).setOpponent(player, playerJoineMsg.data.roomId); //TODO use users API to get opponent info
                    }
                    break;
                }
                console.log(`Player ${playerJoineMsg.data.playerName} joined`)
                player = {
                    id: playerJoineMsg.data.playerId,
                    username: playerJoineMsg.data.playerName
                };
                (loadingComponent as any).setOpponent(player, playerJoineMsg.data.roomId) //TODO use users API to get opponent info
                break;
            case 'playerLeft':
                (loadingComponent as any).removeOpponent();
                break;
            case 'playerReady':
                const playerReadyMsg = message as PlayerReadyMessage;
                console.log(`Player ${playerReadyMsg.data.playerName} is ${playerReadyMsg.data.ready ? "ready" : "not ready"}!`);
                break;
            case 'gameStart':
                if (loadingComponent)
                    loadingComponent.remove();
                startGame(container, onGameOver);
                break;
            default:
                console.log("Unexpected message from server: ", message);
                break
        }
    }
}

function startGame(container: HTMLElement, onGameOver: () => void) {
    const canvas = container.appendChild(createGameWrapper(container));
    setTimeout(() => {
        currentGame = new GameClient(canvas, gameOptions!.config!, socket, onGameOver);
        currentGame.start();
    }, 0);
}

export function GamePage(): HTMLElement {
    gameOptions = gameStorage.getGameOptions();

    const container = document.createElement('div');
    container.className = 'flex flex-col inset overflow-hidden items-center justify-center bg-gray-900 min-h-screen';

    const onGameOver = () => {
        if (gameOptions?.config!.mode == 'standard'){
            setTimeout(() => {
                navigate('lobby');
            }, 3 * 1000)
        }
    }

    getCurrentUser().then(currentUser => {
        user = currentUser;

        if (!user || !gameOptions){
            navigate('lobby');
            return ;

        }
        if (gameOptions!.type == 'local')
            startGame(container, onGameOver);
        else
            matchMaking(container, onGameOver);

    })

    return container;
}

function createGameWrapper(container: HTMLElement): HTMLCanvasElement {
    // Player info header
    const playerHeader = document.createElement('div');
    playerHeader.className = 'flex items-center justify-between w-full max-w-4xl px-8 mb-8';

    // Left player info
    const leftPlayerContainer = document.createElement('div');
    leftPlayerContainer.className = 'flex items-center gap-3 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full px-6 py-3';
    
    const leftPlayerAvatar = document.createElement('img');
    leftPlayerAvatar.src = user!.picture;
    leftPlayerAvatar.className = 'w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold';
    leftPlayerAvatar.textContent = user?.username.charAt(0).toUpperCase() || 'P';
    
    const leftPlayerName = document.createElement('span');
    leftPlayerName.className = 'text-gray-900 font-bold text-lg';
    leftPlayerName.textContent = user?.username || 'Player 1';
    
    leftPlayerContainer.appendChild(leftPlayerAvatar);
    leftPlayerContainer.appendChild(leftPlayerName);

    // VS text
    const vsText = document.createElement('span');
    vsText.className = 'text-orange-500 font-bold text-3xl';
    vsText.textContent = 'VS';

    // Right player info
    const rightPlayerContainer = document.createElement('div');
    rightPlayerContainer.className = 'flex items-center gap-3 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full px-6 py-3';
    rightPlayerContainer.id = 'right-player-container';
    
    const rightPlayerAvatar = document.createElement('img');
    rightPlayerAvatar.className = 'w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold';
    rightPlayerAvatar.id = 'right-player-avatar';
    rightPlayerAvatar.textContent = 'O';
    
    const rightPlayerName = document.createElement('span');
    rightPlayerName.className = 'text-gray-900 font-bold text-lg';
    rightPlayerName.id = 'right-player-name';
    rightPlayerName.textContent = 'Opponent';
    
    rightPlayerContainer.appendChild(rightPlayerAvatar);
    rightPlayerContainer.appendChild(rightPlayerName);

    playerHeader.appendChild(leftPlayerContainer);
    playerHeader.appendChild(vsText);
    playerHeader.appendChild(rightPlayerContainer);

    // Game canvas wrapper
    const gameWrapper = document.createElement('div');
    gameWrapper.className = 'relative';
    gameWrapper.id = 'game-wrapper';

    const canvas = document.createElement('canvas');
    canvas.className = 'border-4 border-blue-500 rounded-3xl shadow-2xl';
    canvas.style.display = 'block';
    canvas.style.background = gameOptions?.config!.backgroundColor!;

    container.appendChild(playerHeader)
    gameWrapper.appendChild(canvas);
    
    container.appendChild(gameWrapper);

    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    return canvas;
}

export function cleanupGamePage(): void {
    gameStorage.clearGameOptions();
    socket?.close()
    currentGame?.stop();
    document.body.style.overflow = '';
    document.body.style.margin = '';
    document.body.style.padding = '';
}