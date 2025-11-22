import { getCurrentUser } from '../utils/auth-script';
import { createPlayerCard } from './PlayerCard';

const currentUser = await getCurrentUser();

// Types for matchmaking
export interface PlayerInfo {
    id: string;
    username: string;
    picture?: string;
    wins?: number;
    losses?: number;
    winRate?: string;
}

export interface MatchmakingState {
    status: 'searching' | 'found' | 'ready' | 'error';
    currentUser: PlayerInfo | null;
    opponent: PlayerInfo | null;
    matchId?: string;
    error?: string;
}

// WebSocket integration interface
export interface MatchmakingEvents {
    onMatchFound: (opponent: PlayerInfo, matchId: string) => void;
    onMatchReady: (matchId: string) => void;
    onMatchError: (error: string) => void;
    onCancel: () => void;
}

// Reusable element creation functions
function createHeader(title: string, subtitle: string, subtitleClass: string = 'text-[#F34C94]'): HTMLElement {
    const header = document.createElement('header');
    header.className = 'text-center mb-12';

    const h1 = document.createElement('h1');
    h1.className = "font-['Press_Start_2P'] text-3xl md:text-5xl neon-text mb-4 text-white";
    h1.textContent = title;

    const subtitleDiv = document.createElement('div');
    subtitleDiv.className = `font-['Orbitron'] text-lg md:text-xl ${subtitleClass}`;
    subtitleDiv.textContent = subtitle;

    header.appendChild(h1);
    header.appendChild(subtitleDiv);

    return header;
}

function createVSSection(isSearching: boolean = true): HTMLElement {
    const vsContainer = document.createElement('div');
    vsContainer.className = 'flex flex-col items-center justify-center text-center';

    const vsText = document.createElement('div');
    vsText.className = "font-['Press_Start_2P'] text-4xl text-[#F34C94] neon-text mb-2 lg:mb-4";
    vsText.textContent = 'VS';

    vsContainer.appendChild(vsText);

    if (isSearching) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'searching-dots text-2xl text-white flex gap-1';

        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.textContent = '.';
            dotsContainer.appendChild(dot);
        }

        vsContainer.appendChild(dotsContainer);
    }

    return vsContainer;
}

function createButton(text: string, id: string, variant: 'cancel' | 'ready' | 'retry'): HTMLElement {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'text-center mt-12';

    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;

    switch (variant) {
        case 'cancel':
            button.className = "bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]";
            break;
        case 'ready':
            button.className = "bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] pulse-glow";
            break;
        case 'retry':
            button.className = "bg-[#F34C94] hover:bg-[#DC25A3] text-white px-8 py-3 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(243,76,148,0.5)]";
            break;
    }

    buttonContainer.appendChild(button);
    return buttonContainer;
}

export function LoadingPong(events?: MatchmakingEvents): HTMLElement {
    const container = document.createElement('div');
    container.className = 'relative w-full h-full min-h-screen bg-gradient-to-b from-gray-900 to-black overflow-hidden';

    // Add custom styles
    const style = document.createElement('style');
    style.textContent = `
    @keyframes neon-glow {
      0%, 100% { 
        text-shadow: 
          0 0 5px #F34C94,
          0 0 10px #F34C94,
          0 0 15px #F34C94,
          0 0 20px #F34C94;
      }
      50% { 
        text-shadow: 
          0 0 2px #F34C94,
          0 0 5px #F34C94,
          0 0 8px #F34C94,
          0 0 12px #F34C94;
      }
    }

    @keyframes pulse-glow {
      0%, 100% { 
        box-shadow: 0 0 20px rgba(243, 76, 148, 0.5);
        transform: scale(1);
      }
      50% { 
        box-shadow: 0 0 40px rgba(243, 76, 148, 0.8);
        transform: scale(1.05);
      }
    }

    @keyframes searching-dots {
      0%, 20% { opacity: 0; }
      50% { opacity: 1; }
      80%, 100% { opacity: 0; }
    }

    .neon-text {
      animation: neon-glow 2s ease-in-out infinite alternate;
    }
  
    .pulse-glow {
      animation: pulse-glow 2s ease-in-out infinite;
    }

    .searching-dots span:nth-child(1) { animation-delay: 0s; }
    .searching-dots span:nth-child(2) { animation-delay: 0.2s; }
    .searching-dots span:nth-child(3) { animation-delay: 0.4s; }

    .searching-dots span {
      animation: searching-dots 1.4s infinite;
    }

    .player-card {
      transition: all 0.3s ease;
    }

    .player-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(243, 76, 148, 0.3);
    }
  `;
    document.head.appendChild(style);

    // State management
    let matchmakingState: MatchmakingState = {
        status: 'searching',
        currentUser: null,
        opponent: null
    };

    // Initialize current user
    if (currentUser) {
        matchmakingState.currentUser = {
            id: currentUser.id,
            username: currentUser.username,
            picture: currentUser.picture,
            wins: 15,
            losses: 5,
            winRate: '75%'
        };
    }

    // Render functions
    const renderSearching = (): HTMLElement => {
        const wrapper = document.createElement('div');
        wrapper.className = 'relative min-h-screen mt-8';

        const mainContainer = document.createElement('div');
        mainContainer.className = 'container mx-auto px-4 py-8 h-full flex flex-col justify-center';

        const header = createHeader('MATCHMAKING', 'Searching for opponent');

        const contentGrid = document.createElement('div');
        contentGrid.className = 'flex flex-col lg:flex-row gap-8 items-center justify-center';

        const leftPlayer = createPlayerCard(matchmakingState.currentUser, false, true, false);
        const vsSection = createVSSection(true);
        const rightPlayer = createPlayerCard(null, true, false, false);

        contentGrid.appendChild(leftPlayer);
        contentGrid.appendChild(vsSection);
        contentGrid.appendChild(rightPlayer);

        const cancelButton = createButton('CANCEL SEARCH', 'cancel-matchmaking', 'cancel');

        mainContainer.appendChild(header);
        mainContainer.appendChild(contentGrid);
        mainContainer.appendChild(cancelButton);
        wrapper.appendChild(mainContainer);

        return wrapper;
    };

    const renderMatchFound = (): HTMLElement => {
        const wrapper = document.createElement('div');
        wrapper.className = 'crt-screen relative min-h-screen';

        const mainContainer = document.createElement('div');
        mainContainer.className = 'container mx-auto px-4 py-8 h-full flex flex-col justify-center';

        const header = createHeader('OPPONENT FOUND!', 'Get ready to play', 'text-green-400');

        const contentGrid = document.createElement('div');
        contentGrid.className = 'flex flex-col lg:flex-row gap-8 items-center justify-center';

        const leftPlayer = createPlayerCard(matchmakingState.currentUser, false, true, true);
        const vsSection = createVSSection(false);
        const rightPlayer = createPlayerCard(matchmakingState.opponent, true, true, true);

        contentGrid.appendChild(leftPlayer);
        contentGrid.appendChild(vsSection);
        contentGrid.appendChild(rightPlayer);

        const readyButton = createButton('READY TO PLAY', 'ready-to-play', 'ready');

        mainContainer.appendChild(header);
        mainContainer.appendChild(contentGrid);
        mainContainer.appendChild(readyButton);
        wrapper.appendChild(mainContainer);

        return wrapper;
    };

    const renderError = (): HTMLElement => {
        const wrapper = document.createElement('div');
        wrapper.className = 'crt-screen relative min-h-screen';

        const mainContainer = document.createElement('div');
        mainContainer.className = 'container mx-auto px-4 py-8 h-full flex flex-col justify-center items-center';

        const centerContent = document.createElement('div');
        centerContent.className = 'text-center';

        const title = document.createElement('h1');
        title.className = "font-['Press_Start_2P'] text-3xl md:text-5xl text-red-500 mb-8";
        title.textContent = 'MATCHMAKING ERROR';

        const errorMessage = document.createElement('p');
        errorMessage.className = "font-['Orbitron'] text-white text-lg mb-8";
        errorMessage.textContent = matchmakingState.error || 'Something went wrong';

        const retryButton = createButton('TRY AGAIN', 'retry-matchmaking', 'retry');

        centerContent.appendChild(title);
        centerContent.appendChild(errorMessage);
        centerContent.appendChild(retryButton);
        mainContainer.appendChild(centerContent);
        wrapper.appendChild(mainContainer);

        return wrapper;
    };

    // Main render function
    const render = () => {
        container.innerHTML = '';
        let content: HTMLElement;

        switch (matchmakingState.status) {
            case 'searching':
                content = renderSearching();
                break;
            case 'found':
                content = renderMatchFound();
                break;
            case 'error':
                content = renderError();
                break;
            default:
                content = renderSearching();
        }

        container.appendChild(content);
        attachEventListeners();
    };

    // Event listeners
    const attachEventListeners = () => {
        const cancelBtn = container.querySelector('#cancel-matchmaking');
        const readyBtn = container.querySelector('#ready-to-play');
        const retryBtn = container.querySelector('#retry-matchmaking');

        cancelBtn?.addEventListener('click', () => {
            events?.onCancel();
        });

        readyBtn?.addEventListener('click', () => {
            if (matchmakingState.matchId) {
                events?.onMatchReady(matchmakingState.matchId);
            }
        });

        retryBtn?.addEventListener('click', () => {
            matchmakingState.status = 'searching';
            matchmakingState.opponent = null;
            matchmakingState.error = undefined;
            render();
        });
    };

    // Public methods for external control
    const updateState = (newState: Partial<MatchmakingState>) => {
        matchmakingState = { ...matchmakingState, ...newState };
        render();
    };

    const removeOpponent = () => {
        matchmakingState.status = 'searching';
        matchmakingState.opponent = null;
        matchmakingState.matchId = undefined;
        render();
    };

    const setOpponent = (opponent: PlayerInfo, matchId: string) => {
        matchmakingState.status = 'found';
        matchmakingState.opponent = opponent;
        matchmakingState.matchId = matchId;
        render();
        events?.onMatchFound(opponent, matchId);
    };

    const setError = (error: string) => {
        matchmakingState.status = 'error';
        matchmakingState.error = error;
        render();
        events?.onMatchError(error);
    };

    // Expose methods on the container for external access
    (container as any).updateState = updateState;
    (container as any).setOpponent = setOpponent;
    (container as any).removeOpponent = removeOpponent;
    (container as any).setError = setError;

    // Initial render
    render();

    return container;
}