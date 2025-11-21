import { default_config, type ConnectionErrorMessage, type ConnectionMessage, type CreateRoomMessage, type GameMessage, type JoinQueueMessage, type JoinRoomMessage, type PlayerJoinedMessage, type PlayerLeftMessage, type PlayerReadyMessage } from "shared/index";
import { GameClient } from "../game/GameClient"
import { navigate } from "../router";
import { LoadingPong } from "../components/loadingGame";
import type { MatchmakingEvents, PlayerInfo } from "../components/loadingGame";
import { getCurrentUser } from "../utils/auth-script";
import { gameStorage, type GameOptionsData } from "../types/game";
import type { UserData } from "../types/user";

let socket: WebSocket;
let user: UserData | null = null;
let gameOptions: GameOptionsData | null = null;
let currentGame: GameClient | null = null;

function matchMaking(container: HTMLElement) {

    const events: MatchmakingEvents = {
        onMatchFound: (opponent: PlayerInfo, matchId: string) =>{},
        onMatchError: (matchId: string) => {},
        onMatchReady: (matchId: string) => {
            const readyMsg: PlayerReadyMessage = {
                type: 'playerReady',
                data: {playerId: user!.id, playerName: user!.username, ready: true},
                timestamp: Date.now()
            };

            socket!.send(JSON.stringify(readyMsg));
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
                const createRoomMsg: CreateRoomMessage = {
                    type: 'createRoom',
                    data: {
                        config: gameOptions.config!,
                    },
                    timestamp: Date.now()
                }
                socket!.send(JSON.stringify(createRoomMsg));
                break;
            case 'join-room':
                const joinRoomMsg: JoinRoomMessage = {
                    type: 'joinRoom',
                    data: {
                        roomId: gameOptions.roomId!
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
                startGame(container);
                break;
            default:
                console.log("Unexpected message from server: ", message);
                break
        }
    }
}

function startGame(container: HTMLElement) {
    const canvas = createGameWrapper(container);
    setTimeout(() => {  
        currentGame = new GameClient(canvas, gameOptions!.config!, gameOptions?.type == 'local' ? undefined : socket, onGameOver);
        currentGame.start();
    }, 0);
}

function onGameOver() {
    if (socket){
        socket.onmessage = null;
        socket.close();
    }
    if (gameOptions?.config!.mode == 'standard'){
        setTimeout(() => {
            navigate('lobby');
        }, 3 * 1000)
    }
}

export function GamePage(): HTMLElement {
    gameOptions = gameStorage.getGameOptions();

    const container = document.createElement('div');
    container.className = 'flex-row inset overflow-hidden items-center justify-center bg-gray-900 max-h-screen';
    container.id = 'game-page';

    getCurrentUser().then(currentUser => {
        user = currentUser;

        if (!user || !gameOptions){
            navigate('lobby');
            return ;
        }
        if (gameOptions!.type == 'local')
            startGame(container);
        else
            matchMaking(container);

    })

    return container;
}

function createGameWrapper(container: HTMLElement): HTMLCanvasElement {
    // Player info header
    const playerHeader = document.createElement('div');
    playerHeader.className = 'grid grid-cols-3 items-center w-full max-w-4xl px-8 mb-8';
    playerHeader.id = 'player-header';

    const createPlayerContainer = (name: string, id?: string, king: boolean = false, avatar?: string): HTMLElement => {
        const playerContainer = document.createElement('div');
        playerContainer.className = 'flex items-center justify-center gap-3 bg-gradient-to-r from-pink-400 to-pink-300 rounded-full px-6 py-3 min-w-0 w-full';
        playerContainer.id = id ? id : '';

        if (gameOptions?.type != 'local'){
            const playerAvatar = document.createElement('img');
            playerAvatar.className = 'w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0';
            playerAvatar.id = id ? id : '';
            playerAvatar.src = avatar ? avatar : ''; //TODO get opponent avatar

            playerContainer.appendChild(playerAvatar);
        }
        
        const playerName = document.createElement('span');
        playerName.className = 'text-gray-900 font-bold text-lg truncate';
        playerName.textContent = name;

        playerContainer.appendChild(playerName);
        
        if (king){
            const kingLogo = document.createElement('img');
            kingLogo.className = 'w-10 h-10 flex items-center justify-center text-white font-bold flex-shrink-0';
            kingLogo.src = '/images/crown.png'

            playerContainer.appendChild(kingLogo)
        }
        
        return playerContainer;
    };

    // Create player containers
    const leftPlayerContainer = createPlayerContainer(gameOptions!.config!.playerNames[0], 'left-player-name', gameOptions?.config?.mode == 'tournament', user!.avatar);
    const rightPlayerContainer = createPlayerContainer(gameOptions!.config!.playerNames[1], 'right-player-name');

    // VS text
    const vsText = document.createElement('span');
    vsText.className = 'text-orange-500 font-bold text-3xl justify-self-center';
    vsText.textContent = 'VS';

    playerHeader.appendChild(leftPlayerContainer);
    playerHeader.appendChild(vsText);
    playerHeader.appendChild(rightPlayerContainer);

    // Game canvas wrapper - main container
    const gameWrapper = document.createElement('div');
    gameWrapper.className = 'flex flex-col items-center justify-center w-full h-screen p-8';
    gameWrapper.id = 'game-wrapper';

    // Canvas and queue container - sits below player header
    const gameContentContainer = document.createElement('div');
    gameContentContainer.className = 'flex items-center justify-center gap-8 flex-1 max-w-full';
    gameContentContainer.id = 'game-content-container';

    // Queue section (only for tournament mode)
    if (gameOptions?.config?.mode == 'tournament'){
        const queueContainer = document.createElement('div');
        queueContainer.className = 'flex flex-col gap-4 h-full w-64 min-w-64 max-w-64 justify-start items-center flex-shrink-0';
        queueContainer.id = 'queue-container';

        const queueTitle = document.createElement('span');
        queueTitle.className = 'text-orange-500 font-bold text-3xl mb-2';
        queueTitle.textContent = 'queue';

        const queue = document.createElement('div');
        queue.className = 'flex flex-col gap-3 p-6 border-4 border-yellow-500 rounded-3xl shadow-2xl bg-blue-900/30 overflow-y-auto h-full w-full';
        queue.id = 'queue';
        
        queueContainer.appendChild(queueTitle);
        queueContainer.appendChild(queue);
        
        for (let i = 0; i < gameOptions.config!.numPlayers!; i++){
            if (i < 2)
                continue;
            queue.appendChild(createPlayerContainer(gameOptions!.config!.playerNames[i], undefined));
        }

        gameContentContainer.appendChild(queueContainer);
    }

    // Canvas container - centered
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'flex items-center justify-center h-full aspect-video';
    canvasContainer.id = 'canvas-container';

    const canvas = document.createElement('canvas');
    canvas.className = 'border-4 border-blue-500 rounded-3xl shadow-2xl w-full h-full';
    canvas.style.display = 'block';
    canvas.style.background = gameOptions?.config!.backgroundColor!;
    
    canvasContainer.appendChild(canvas);
    gameContentContainer.appendChild(canvasContainer);

    // Assemble the structure
    gameWrapper.appendChild(playerHeader); 
    gameWrapper.appendChild(gameContentContainer);
    
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