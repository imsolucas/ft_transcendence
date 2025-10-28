import { LoadingPong } from "../components/loadingGame";
import { navigate } from "../router";

export var socket: WebSocket;

export function LobbyPage(): HTMLElement {
	const container = document.createElement('div');
	container.className =
		'min-h-screen bg-gradient-to-b from-[#4B1B67] via-[#872481] via-[#DC25A3] via-[#F34C94] to-[#F3796A] pt-16 overflow-hidden';

	// Add minimal custom styles for complex animations that can't be done with Tailwind
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

		@keyframes ball-bounce {
			0%, 100% { transform: translateX(0) translateY(0); }
			25% { transform: translateX(200px) translateY(-50px); }
			50% { transform: translateX(400px) translateY(0); }
			75% { transform: translateX(200px) translateY(50px); }
		}

		@keyframes paddle-move {
			0%, 100% { transform: translateY(0); }
			50% { transform: translateY(100px); }
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

		@keyframes ripple {
			to {
				transform: scale(4);
				opacity: 0;
			}
		}

		.neon-text {
			animation: neon-glow 2s ease-in-out infinite alternate;
		}

		.pong-ball {
			animation: ball-bounce 3s ease-in-out infinite;
		}

		.paddle-left {
			animation: paddle-move 2s ease-in-out infinite;
		}

		.paddle-right {
			animation: paddle-move 2s ease-in-out infinite reverse;
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
	`;
	document.head.appendChild(style);

	container.innerHTML = `
		<!-- CRT Screen Effect -->
		<div class="crt-screen relative min-h-screen bg-gradient-to-b from-gray-900 to-black flicker">
			<!-- Main Container -->
			<div class="container mx-auto px-4 py-8">
				<!-- Header -->
				<header class="text-center mb-8">
					<h1 class="font-['Press_Start_2P'] text-4xl md:text-6xl neon-text mb-4 text-white">
						PONG ARCADE
					</h1>
					<div class="font-['Orbitron'] text-lg md:text-xl text-[#F34C94]">
						Welcome to the Digital Arena
					</div>
				</header>

				<!-- Main Content -->
				<div class="flex flex-col lg:flex-row gap-8">
					<!-- Left Side - Menu -->
					<div class="w-full lg:w-1/2 space-y-6">
						<!-- Game Mode Buttons -->
						<div class="space-y-4">
							<h2 class="font-['Orbitron'] text-xl mb-4 text-[#F34C94]">Game Modes</h2>
							
							<button class="neon-button localBtn w-full border-2 border-[#F34C94] text-white py-4 px-6 rounded-lg font-['Press_Start_2P'] text-sm md:text-base transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(243,76,148,0.5)] relative overflow-hidden bg-gradient-to-r from-[#4B1B67] to-[#872481]">
								🎮 LOCAL GAME
							</button>
							
							<button class="neon-button onlineBtn w-full border-2 border-[#F34C94] text-white py-4 px-6 rounded-lg font-['Press_Start_2P'] text-sm md:text-base transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(243,76,148,0.5)] relative overflow-hidden bg-gradient-to-r from-[#872481] to-[#DC25A3]">
								🌐 MULTIPLAYER
							</button>
						</div>

						<!-- Quick Stats -->
						<div class="space-y-4">
							<h2 class="font-['Orbitron'] text-xl mb-4 text-[#F34C94]">Quick Stats</h2>
							
							<div class="bg-gray-900 border border-[#F34C94] p-4 rounded-lg">
								<div class="grid grid-cols-2 gap-4 text-center">
									<div>
										<div class="font-['Press_Start_2P'] text-xs text-[#F34C94]">WINS</div>
										<div class="font-['Orbitron'] text-lg text-white">42</div>
									</div>
									<div>
										<div class="font-['Press_Start_2P'] text-xs text-[#F34C94]">LOSSES</div>
										<div class="font-['Orbitron'] text-lg text-white">13</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Right Side - Game Preview -->
					<div class="w-full lg:w-1/2">
						<div class="space-y-6">
							<h2 class="font-['Orbitron'] text-xl mb-4 text-[#F34C94]">Game Preview</h2>
							
							<!-- Pong Table Preview -->
							<div class="relative bg-gray-900 border-4 border-[#F34C94] rounded-lg p-8 h-80 md:h-96 overflow-hidden">
								<!-- Pong Table -->
								<div class="relative w-full h-full border-2 border-white rounded-lg">
									<!-- Center Line -->
									<div class="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-full bg-white opacity-30">
										<div class="w-full h-8 bg-white"></div>
										<div class="w-full h-8 bg-transparent"></div>
										<div class="w-full h-8 bg-white"></div>
										<div class="w-full h-8 bg-transparent"></div>
										<div class="w-full h-8 bg-white"></div>
										<div class="w-full h-8 bg-transparent"></div>
										<div class="w-full h-8 bg-white"></div>
										<div class="w-full h-8 bg-transparent"></div>
										<div class="w-full h-8 bg-white"></div>
										<div class="w-full h-8 bg-transparent"></div>
										<div class="w-full h-8 bg-white"></div>
										<div class="w-full h-8 bg-transparent"></div>
									</div>
									
									<!-- Paddles -->
									<div class="paddle-left absolute w-4 h-20 bg-[#DC25A3] shadow-[0_0_10px_#DC25A3] left-5"></div>
									<div class="paddle-right absolute w-4 h-20 bg-[#DC25A3] shadow-[0_0_10px_#DC25A3] right-5"></div>
									
									<!-- Ball -->
									<div class="pong-ball absolute w-5 h-5 bg-[#F34C94] rounded-full shadow-[0_0_10px_#F34C94] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
								</div>
								
								<!-- Score Display -->
								<div class="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-8">
									<div class="text-center">
										<div class="font-['Press_Start_2P'] text-2xl text-[#F34C94]">0</div>
										<div class="font-['Orbitron'] text-xs text-gray-400">PLAYER 1</div>
									</div>
									<div class="text-center">
										<div class="font-['Press_Start_2P'] text-2xl text-[#F34C94]">0</div>
										<div class="font-['Orbitron'] text-xs text-gray-400">PLAYER 2</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;

	// Add interactive JavaScript functionality
	const buttons = container.querySelectorAll('.neon-button');
	buttons.forEach(button => {
		button.addEventListener('click', function () {
			// Create ripple effect
			const ripple = document.createElement('div');
			ripple.style.position = 'absolute';
			ripple.style.borderRadius = '50%';
			ripple.style.background = 'rgba(255, 255, 255, 0.3)';
			ripple.style.transform = 'scale(0)';
			ripple.style.animation = 'ripple 0.6s linear';
			ripple.style.left = '50%';
			ripple.style.top = '50%';
			ripple.style.width = '20px';
			ripple.style.height = '20px';
			ripple.style.marginLeft = '-10px';
			ripple.style.marginTop = '-10px';

			(button as HTMLElement).appendChild(ripple);

			setTimeout(() => {
				ripple.remove();
			}, 600);
		});
	});

	setTimeout(() => {
    const localGame = container.querySelector('.localBtn');
    const onlineGame = container.querySelector('.onlineBtn');

    localGame?.addEventListener('click', () => {
        navigate('game');
    });
    
    onlineGame?.addEventListener('click', () => {
        // Create the loading component with event handlers
		try {
			socket = new WebSocket("ws/localhost:3001/ws/game");
			console.log("connected to game socket");
		}
		catch(error) {
			console.log("could not connect to game websocket", error);
		}

        const loadingComponent = LoadingPong({

            onMatchFound: (opponent, matchId) => {
                console.log('Match found:', opponent, matchId);
                // You can update UI or prepare for game start
            },
            onMatchReady: (matchId) => {
                console.log('Match ready:', matchId);
                // Navigate to game or start game logic
                navigate('game'); // Or however you start the actual game
            },
            onMatchError: (error) => {
                console.error('Matchmaking error:', error);
                // Handle error - maybe show a toast or alert
            },
            onCancel: () => {
                console.log('Matchmaking cancelled');
                // Remove the loading component and return to lobby
                loadingComponent.remove();
            }
        });

        // Style the component as a full-screen overlay
        loadingComponent.style.position = 'fixed';
        loadingComponent.style.top = '0';
        loadingComponent.style.left = '0';
        loadingComponent.style.width = '100vw';
        loadingComponent.style.height = '100vh';
        loadingComponent.style.zIndex = '9999';

        // Add to body or container
        document.body.appendChild(loadingComponent);

        // Optional: Simulate finding a match after 3 seconds for testing
        setTimeout(() => {
            const mockOpponent = {
                id: '2',
                username: 'CoolPlayer42',
                picture: '/images/default-avatar.png',
                level: 12,
                wins: 23,
                losses: 8,
                winRate: '74%'
            };
            
            // Use the exposed method to update the component
            (loadingComponent as any).setOpponent(mockOpponent, 'match-123');
        }, 3000);

        // Optional: Simulate error for testing
        // setTimeout(() => {
        //     (loadingComponent as any).setError('Connection failed. Please try again.');
        // }, 5000);
    });
}, 0);


	return container;
}
