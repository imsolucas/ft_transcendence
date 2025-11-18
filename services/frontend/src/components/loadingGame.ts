import { getCurrentUser } from '../utils/auth-script';

const currentUser = await getCurrentUser();

// Types for matchmaking
export interface PlayerInfo {
	id: string;
	username: string;
	picture?: string;
	level?: number;
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

    @keyframes scanlines {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100vh); }
    }

    @keyframes flicker {
      0%, 100% { opacity: 1; }
      98% { opacity: 1; }
      99% { opacity: 0.8; }
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

    .crt-screen::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(transparent 50%, rgba(0, 255, 255, 0.03) 50%);
      background-size: 100% 4px;
      pointer-events: none;
      animation: scanlines 0.1s linear infinite;
    }

    .crt-screen::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%);
      pointer-events: none;
    }

    .flicker {
      animation: flicker 0.15s infinite linear;
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
			level: 10, // Mock data - should come from backend
			wins: 15,
			losses: 5,
			winRate: '75%'
		};
	}

	// Render functions
	const renderSearching = () => {
		return `
      <div class="crt-screen relative min-h-screen mt-8 flicker">
        <!-- Main Container -->
        <div class="container mx-auto px-4 py-8 h-full flex flex-col justify-center">
          <!-- Header -->
          <header class="text-center mb-12">
            <h1 class="font-['Press_Start_2P'] text-3xl md:text-5xl neon-text mb-4 text-white">
              MATCHMAKING
            </h1>
            <div class="font-['Orbitron'] text-lg md:text-xl text-[#F34C94]">
              Searching for opponent
            </div>
          </header>

          <!-- Main Content -->
          <div class="flex flex-col lg:flex-row gap-8 items-center justify-center">
            <!-- Left Side - Current Player -->
            <div class="w-full lg:w-1/3">
              <div class="player-card bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border-2 border-[#F34C94]/30 shadow-[0_0_30px_rgba(243,76,148,0.2)]">
                <div class="text-center">
                  <div class="relative mb-4">
                    <img src="${matchmakingState.currentUser?.picture || '/images/pong.png'}" 
                         alt="Your Avatar" 
                         class="w-24 h-24 rounded-full border-4 border-[#F34C94] shadow-[0_0_20px_rgba(243,76,148,0.6)] object-cover mx-auto">
                    <div class="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                      <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <h3 class="font-['Press_Start_2P'] text-lg text-[#F34C94] mb-2">YOU</h3>
                  <p class="font-['Orbitron'] text-white text-xl mb-2">${matchmakingState.currentUser?.username || 'Player'}</p>
                  <div class="grid grid-cols-3 gap-2 text-xs">
                    <div class="text-center">
                      <div class="text-[#F34C94]">LVL</div>
                      <div class="text-white">${matchmakingState.currentUser?.level || 1}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[#F34C94]">WINS</div>
                      <div class="text-white">${matchmakingState.currentUser?.wins || 0}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[#F34C94]">RATE</div>
                      <div class="text-white">${matchmakingState.currentUser?.winRate || '0%'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Center - VS Area -->
			<div class="flex flex-col items-center justify-center text-center">
  			  <div class="font-['Press_Start_2P'] text-4xl text-[#F34C94] neon-text mb-2 lg:mb-4">VS</div>
  			  <div class="searching-dots text-2xl text-white flex gap-1">
    			<span>.</span><span>.</span><span>.</span>
  			  </div>
			</div>


            <!-- Right Side - Opponent Placeholder -->
            <div class="w-full lg:w-1/3">
              <div class="player-card bg-gray-900/40 backdrop-blur-md rounded-2xl p-6 border-2 border-gray-600/30 shadow-[0_0_20px_rgba(100,100,100,0.1)]">
                <div class="text-center">
                  <div class="relative mb-4">
                    <div class="w-24 h-24 rounded-full border-4 border-gray-600 bg-gray-800 mx-auto flex items-center justify-center">
                      <div class="w-8 h-8 border-2 border-gray-600 rounded-full animate-spin"></div>
                    </div>
                  </div>
                  <h3 class="font-['Press_Start_2P'] text-lg text-gray-500 mb-2">OPPONENT</h3>
                  <p class="font-['Orbitron'] text-gray-400 text-xl mb-2">Searching...</p>
                  <div class="grid grid-cols-3 gap-2 text-xs">
                    <div class="text-center">
                      <div class="text-gray-500">LVL</div>
                      <div class="text-gray-400">-</div>
                    </div>
                    <div class="text-center">
                      <div class="text-gray-500">WINS</div>
                      <div class="text-gray-400">-</div>
                    </div>
                    <div class="text-center">
                      <div class="text-gray-500">RATE</div>
                      <div class="text-gray-400">-</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cancel Button -->
          <div class="text-center mt-12">
            <button id="cancel-matchmaking" 
                    class="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              CANCEL SEARCH
            </button>
          </div>
        </div>
      </div>
    `;
	};

	const renderMatchFound = () => {
		return `
      <div class="crt-screen relative min-h-screen flicker">
        <!-- Main Container -->
        <div class="container mx-auto px-4 py-8 h-full flex flex-col justify-center">
          <!-- Header -->
          <header class="text-center mb-12">
            <h1 class="font-['Press_Start_2P'] text-3xl md:text-5xl neon-text mb-4 text-white">
              OPPONENT FOUND!
            </h1>
            <div class="font-['Orbitron'] text-lg md:text-xl text-green-400">
              Get ready to play
            </div>
          </header>

          <!-- Main Content -->
          <div class="flex flex-col lg:flex-row gap-8 items-center justify-center">
            <!-- Left Side - Current Player -->
            <div class="w-full lg:w-1/3">
              <div class="player-card bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border-2 border-[#F34C94]/30 shadow-[0_0_30px_rgba(243,76,148,0.2)] pulse-glow">
                <div class="text-center">
                  <div class="relative mb-4">
                    <img src="${matchmakingState.currentUser?.picture || '/images/pong.png'}" 
                         alt="Your Avatar" 
                         class="w-24 h-24 rounded-full border-4 border-[#F34C94] shadow-[0_0_20px_rgba(243,76,148,0.6)] object-cover mx-auto">
                    <div class="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                      <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <h3 class="font-['Press_Start_2P'] text-lg text-[#F34C94] mb-2">YOU</h3>
                  <p class="font-['Orbitron'] text-white text-xl mb-2">${matchmakingState.currentUser?.username || 'Player'}</p>
                  <div class="grid grid-cols-3 gap-2 text-xs">
                    <div class="text-center">
                      <div class="text-[#F34C94]">LVL</div>
                      <div class="text-white">${matchmakingState.currentUser?.level || 1}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[#F34C94]">WINS</div>
                      <div class="text-white">${matchmakingState.currentUser?.wins || 0}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[#F34C94]">RATE</div>
                      <div class="text-white">${matchmakingState.currentUser?.winRate || '0%'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Center - VS Area -->
            <div class="w-full lg:w-1/3 text-center">
              <div class="relative">
                <!-- Animated Pong Table -->
                <div class="relative bg-gray-900 border-4 border-[#F34C94] rounded-lg p-6 h-48 md:h-64 overflow-hidden mx-auto max-w-md">
                  <!-- Pong Table -->
                  <div class="relative w-full h-full border-2 border-white rounded-lg">
                    <!-- Center Line -->
                    <div class="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-white opacity-30">
                      <div class="w-full h-6 bg-white"></div>
                      <div class="w-full h-6 bg-transparent"></div>
                      <div class="w-full h-6 bg-white"></div>
                      <div class="w-full h-6 bg-transparent"></div>
                      <div class="w-full h-6 bg-white"></div>
                      <div class="w-full h-6 bg-transparent"></div>
                      <div class="w-full h-6 bg-white"></div>
                      <div class="w-full h-6 bg-transparent"></div>
                    </div>
                    
                    <!-- Paddles -->
                    <div class="paddle-left absolute w-3 h-16 bg-[#DC25A3] shadow-[0_0_10px_#DC25A3] left-3"></div>
                    <div class="paddle-right absolute w-3 h-16 bg-[#DC25A3] shadow-[0_0_10px_#DC25A3] right-3"></div>
                    
                    <!-- Ball -->
                    <div class="pong-ball absolute w-4 h-4 bg-[#F34C94] rounded-full shadow-[0_0_10px_#F34C94] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                </div>

                <!-- VS Text -->
                <div class="mt-6">
                  <div class="font-['Press_Start_2P'] text-4xl text-[#F34C94] neon-text mb-4">VS</div>
                  <div class="text-green-400 text-lg font-['Orbitron']">
                    Match Found!
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Side - Opponent -->
            <div class="w-full lg:w-1/3">
              <div class="player-card bg-gray-900/80 backdrop-blur-md rounded-2xl p-6 border-2 border-[#F34C94]/30 shadow-[0_0_30px_rgba(243,76,148,0.2)] pulse-glow">
                <div class="text-center">
                  <div class="relative mb-4">
                    <img src="${matchmakingState.opponent?.picture || '/images/pong.png'}" 
                         alt="Opponent Avatar" 
                         class="w-24 h-24 rounded-full border-4 border-[#F34C94] shadow-[0_0_20px_rgba(243,76,148,0.6)] object-cover mx-auto">
                    <div class="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                      <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <h3 class="font-['Press_Start_2P'] text-lg text-[#F34C94] mb-2">OPPONENT</h3>
                  <p class="font-['Orbitron'] text-white text-xl mb-2">${matchmakingState.opponent?.username || 'Player'}</p>
                  <div class="grid grid-cols-3 gap-2 text-xs">
                    <div class="text-center">
                      <div class="text-[#F34C94]">LVL</div>
                      <div class="text-white">${matchmakingState.opponent?.level || 1}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[#F34C94]">WINS</div>
                      <div class="text-white">${matchmakingState.opponent?.wins || 0}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-[#F34C94]">RATE</div>
                      <div class="text-white">${matchmakingState.opponent?.winRate || '0%'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Ready Button -->
          <div class="text-center mt-12">
            <button id="ready-to-play" 
                    class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] pulse-glow">
              READY TO PLAY
            </button>
          </div>
        </div>
      </div>
    `;
	};

	const renderError = () => {
		return `
      <div class="crt-screen relative min-h-screen flicker">
        <div class="container mx-auto px-4 py-8 h-full flex flex-col justify-center items-center">
          <div class="text-center">
            <h1 class="font-['Press_Start_2P'] text-3xl md:text-5xl text-red-500 mb-8">
              MATCHMAKING ERROR
            </h1>
            <p class="font-['Orbitron'] text-white text-lg mb-8">
              ${matchmakingState.error || 'Something went wrong'}
            </p>
            <button id="retry-matchmaking" 
                    class="bg-[#F34C94] hover:bg-[#DC25A3] text-white px-8 py-3 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(243,76,148,0.5)]">
              TRY AGAIN
            </button>
          </div>
        </div>
      </div>
    `;
	};

	// Main render function
	const render = () => {
		switch (matchmakingState.status) {
			case 'searching':
				container.innerHTML = renderSearching();
				break;
			case 'found':
				container.innerHTML = renderMatchFound();
				break;
			case 'error':
				container.innerHTML = renderError();
				break;
			default:
				container.innerHTML = renderSearching();
		}
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
	(container as any).setError = setError;

	// Initial render
	render();

	return container;
}