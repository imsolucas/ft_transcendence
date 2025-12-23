import { default_config, type ConnectionErrorMessage, type ConnectionMessage, type CreateRoomMessage, type GameMessage, type GameStartMessage, type JoinQueueMessage, type JoinRoomMessage, type PlayerJoinedMessage, type PlayerLeftMessage, type PlayerReadyMessage, type serializablePlayer, type TournamentState } from "shared/index";
import { GameClient } from "../game/GameClient"
import { navigate } from "../router";
import { MatchmakingScreen } from "../components/matchmaking/MatchmakingScreen";
import type { MatchmakingEvents, MatchmakingPlayer } from "../components/matchmaking/MatchmakingScreen";
import { getCurrentUser } from "../utils/auth-script";
import { gameStorage, type GameOptionsData } from "../types/game";
import type { UserData } from "../types/user";
import { API_DOMAIN } from "../utils/api";

let socket: WebSocket;
let user: UserData | null = null;
let gameOptions: GameOptionsData | null = null;
let currentGame: GameClient | null = null;
let playersInRoom: serializablePlayer[] | null = null;

function matchMaking(container: HTMLElement) {

    const events: MatchmakingEvents = {
        onMatchFound: (opponent: MatchmakingPlayer, matchId: string) =>{},
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
            history.back();
        }
	}

	const loadingComponent = MatchmakingScreen(events);
	container.appendChild(loadingComponent);
	
	// Create WebSocket connection
	const wsUrl = `wss://${API_DOMAIN}/ws/game`;
	console.log('Connecting to WebSocket:', wsUrl);
	
	try {
		socket = new WebSocket(wsUrl);
	} catch (error) {
		console.error('Failed to create WebSocket:', error);
		navigate('lobby');
		alert('Failed to create WebSocket connection. Please try again.');
		return;
	}
	
	socket.onopen = () => {
		console.log('WebSocket connection opened');
		const connectionMsg: ConnectionMessage = {
			type: 'connection',
			data: {
				picture: user!.picture,
				playerName: user!.username,
				playerId: user!.id,
			},
			timestamp: Date.now()
		}

		socket!.send(JSON.stringify(connectionMsg));
	}

	socket.onerror = (ev: Event) => {
		console.error('WebSocket error:', ev);
		console.error('WebSocket readyState:', socket?.readyState);
		// Don't navigate immediately - let onclose handle it
	}

	socket.onclose = (event: CloseEvent) => {
		console.log('WebSocket closed:', event.code, event.reason);
		// Only navigate if it wasn't a normal closure and we're not already navigating
		if (event.code !== 1000 && event.code !== 1001) {
			console.error('WebSocket closed unexpectedly:', event.code, event.reason);
			// Only show alert if we haven't already navigated away
			if (window.location.pathname.includes('/game')) {
				navigate('lobby');
				alert('Connection to game server lost. Please try again.');
			}
		}
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
                        roomType: gameOptions.mode
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
                console.log("Error from server:", errorMsg.data.message);
                navigate('lobby');
                alert(`Error from server: ${message.data.message}`);
                break;
            case 'playerJoined':
                const playerJoinMsg = message as PlayerJoinedMessage
                let player: MatchmakingPlayer;

                gameOptions!.config = default_config.standardGame; //TODO backend will pass config
                playersInRoom = playerJoinMsg.data.playersInRoom;
                if (playerJoinMsg.data.playerName == user!.username) {
                    console.log('Joined room with id: ', playerJoinMsg.data.roomId);

                    // When current user joins, add all existing players as opponents
                    if (playerJoinMsg.data.playersInRoom.length > 1){
                        playerJoinMsg.data.playersInRoom.forEach((existingPlayer) => {
                            if (existingPlayer.id !== user!.id) {
                                player = {
                                    id: existingPlayer.id,
                                    username: existingPlayer.name,
                                    picture: existingPlayer.picture
                                };

                                // Call async addOpponent (will fetch stats from database)
                                (loadingComponent as any).addOpponent(player, playerJoinMsg.data.roomId).catch((err: any) => {
                                    console.error('Error adding opponent:', err);
                                });
                            }
                        });
                    }
                    break;
                }

                // Another player joined the room
                console.log(`Player ${playerJoinMsg.data.playerName} joined`)
                player = {
                    id: playerJoinMsg.data.playerId,
                    username: playerJoinMsg.data.playerName,
                    picture: playerJoinMsg.data.picture
                };

                // Call async addOpponent (will fetch stats from database)
                (loadingComponent as any).addOpponent(player, playerJoinMsg.data.roomId).catch((err: any) => {
                    console.error('Error adding opponent:', err);
                });
                break;
            case 'playerLeft':
                const playerLeftMsg = message as PlayerLeftMessage;

                // For tournament mode, remove specific opponent by username
                if (gameOptions?.mode === 'tournament') {
                    (loadingComponent as any).removeOpponentByUsername(playerLeftMsg.data.playerName);
                } else {
                    // For standard mode, remove the opponent
                    (loadingComponent as any).removeOpponent();
                }
                break;
            case 'playerReady':
                const playerReadyMsg = message as PlayerReadyMessage;
                console.log(`Player ${playerReadyMsg.data.playerName} is ${playerReadyMsg.data.ready ? "ready" : "not ready"}!`);
                break;
            case 'gameStart':
                const gameStartMsg = message as GameStartMessage

                if (loadingComponent)
                    loadingComponent.remove();
                startGame(container, gameStartMsg.data.tournamentState);
                break;
            default:
                console.log("Unexpected message from server: ", message);
                break
        }
    }
}

function startGame(container: HTMLElement, tournamentState?: TournamentState) {
    const canvas = createGameWrapper(container);
    setTimeout(() => {
        currentGame = new GameClient(
            canvas,
            gameOptions!.config!,
            onGameOver,
            gameOptions?.type == 'local' ? undefined : socket,
            user!.username,
            tournamentState,
            playersInRoom ? playersInRoom : undefined
        );
        currentGame.start();
    }, 0);
}

function onGameOver(error?: string) {
    if (error){
        currentGame!.stop();
        navigate('lobby');
        alert(error);
        return ;
    }
    currentGame?.stop();
    addBackToLobbyButton();
}

export function GamePage(): HTMLElement {
    gameOptions = gameStorage.getGameOptions();

    const container = document.createElement('div');
    container.className = 'flex-row inset overflow-hidden items-center justify-center bg-gray-900 max-h-screen';
    container.id = 'game-page';

    getCurrentUser().then(currentUser => {
        user = currentUser;

        if (!user || !gameOptions){
            console.error('Game page: Missing user or game options');
            navigate('lobby');
            return ;
        }
        if (gameOptions!.type == 'local')
            startGame(container);
        else
            matchMaking(container);

    }).catch((error) => {
        console.error('Game page: Failed to get current user:', error);
        navigate('lobby');
    });

    return container;
}

function addBackToLobbyButton() {
    const canvasContainer = document.getElementById('canvas-container') as HTMLDivElement;
    const backToLobbyButton = document.createElement('button') as HTMLButtonElement;

    backToLobbyButton.className = 'absolute bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-colors duration-200';
    backToLobbyButton.id = 'back-to-lobby-button';
    backToLobbyButton.textContent = 'Back To Lobby';
    backToLobbyButton.onclick = () => navigate('lobby');

    // Make canvas container relative for absolute positioning
    canvasContainer.style.position = 'relative';

    canvasContainer.appendChild(backToLobbyButton);
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
        if (gameOptions!.mode == 'tournament'){
            const playerScore = document.createElement('span');
            playerScore.className = 'text-gray-900 font-bold text-lg';

            playerContainer.appendChild(playerScore);
        }

        return playerContainer;
    };

    // Create player containers
    var leftPlayerName: string;
    var leftPlayerAvatar: string | undefined = undefined;

    var rightPlayerName: string;
    var rightPlayerAvatar: string | undefined = undefined;

    if (gameOptions?.type == 'local'){
        leftPlayerName = gameOptions!.config!.playerNames[0];
        rightPlayerName = gameOptions!.config!.playerNames[1];
    } else {
        playersInRoom?.forEach(player => {
            if (player.position == 1){
                leftPlayerName = player.name;
                leftPlayerAvatar = player.picture
            }
            if (player.position == 2){
                rightPlayerName = player.name;
                rightPlayerAvatar = player.picture;
            }
        });
    }

    const leftPlayerContainer = createPlayerContainer(leftPlayerName!, 'left-player-container', gameOptions?.config?.mode == 'tournament', leftPlayerAvatar);
    const rightPlayerContainer = createPlayerContainer(rightPlayerName!, 'right-player-container', false, rightPlayerAvatar);

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
    if (gameOptions?.mode == 'tournament'){
        const queueContainer = document.createElement('div');
        queueContainer.className = 'flex flex-col gap-4 h-full w-64 min-w-64 max-w-74 justify-start items-center flex-shrink-0';
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
    if (currentGame){
        currentGame?.stop();
        currentGame = null;
    }
    playersInRoom = [];
    gameStorage.clearGameOptions();
    gameOptions = null;
    if (socket) {
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
        socket = null as any;
    }
    document.body.style.overflow = '';
    document.body.style.margin = '';
    document.body.style.padding = '';
}
