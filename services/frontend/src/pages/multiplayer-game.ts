import { t } from '../i18n';
import { navigate } from '../router';
import { GameConfig } from '../components/GameConfig';
import { LoadingPong } from '../components/loadingGame';
import type { GameConfig as GameConfigType } from '../types/game';

type MultiplayerMode = 'mode-selection' | 'lobby-selection' | 'config-create' | 'join-lobby' | 'loading';
type GameMode = 'standard' | 'tournament';

// Mock API functions
const mockRandomMatchmaking = async (): Promise<{ success: boolean; matchId?: string; error?: string }> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				success: true,
				matchId: `match-${Math.random().toString(36).substr(2, 9)}`
			});
		}, 2000);
	});
};

const mockCreateLobby = async (config: GameConfigType): Promise<{ success: boolean; lobbyId?: string; error?: string }> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				success: true,
				lobbyId: `lobby-${Math.random().toString(36).substr(2, 9)}`
			});
		}, 1500);
	});
};

const mockJoinLobby = async (lobbyId: string): Promise<{ success: boolean; error?: string }> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			// Mock: randomly succeed or fail
			if (Math.random() > 0.3) {
				resolve({ success: true });
			} else {
				resolve({ success: false, error: 'Lobby not found or is full' });
			}
		}, 1500);
	});
};

export function MultiplayerGamePage(): HTMLElement {
	const container = document.createElement('div');
	container.className =
		'min-h-screen bg-gradient-to-b from-[#4B1B67] via-[#872481] via-[#DC25A3] via-[#F34C94] to-[#F3796A] pt-16 overflow-hidden';

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
			99% { opacity: 1; }
			99.5% { opacity: 0.98; }
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
			animation: flicker 8s infinite linear;
		}
	`;
	document.head.appendChild(style);

	let currentMode: MultiplayerMode = 'mode-selection';
	let selectedGameMode: GameMode = 'standard';

	const renderModeSelection = () => {
		container.innerHTML = `
			<div class="crt-screen relative min-h-screen bg-gradient-to-b from-gray-900 to-black flicker">
				<div class="container mx-auto px-4 py-8">
					<header class="text-center mb-12">
						<h1 class="font-['Press_Start_2P'] text-4xl md:text-6xl neon-text mb-4 text-white">
							${t('multiplayer.title')}
						</h1>
						<div class="font-['Orbitron'] text-lg md:text-xl text-[#F34C94]">
							${t('multiplayer.subtitle')}
						</div>
					</header>

					<div class="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
						<!-- 1v1 Mode -->
						<button 
							id="one-vs-one-btn"
							class="flex-1 border-2 border-[#F34C94] text-white py-8 px-6 rounded-lg font-['Press_Start_2P'] text-lg md:text-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(243,76,148,0.6)] bg-gradient-to-r from-[#4B1B67] to-[#872481] relative overflow-hidden"
						>
							<div class="text-4xl mb-4">⚔️</div>
							<div class="mb-2">${t('localGame.oneVsOne')}</div>
							<div class="font-['Orbitron'] text-sm text-gray-300">${t('localGame.oneVsOneDesc')}</div>
						</button>

						<!-- Tournament Mode -->
						<button 
							id="tournament-btn"
							class="flex-1 border-2 border-[#F34C94] text-white py-8 px-6 rounded-lg font-['Press_Start_2P'] text-lg md:text-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(243,76,148,0.6)] bg-gradient-to-r from-[#872481] to-[#DC25A3] relative overflow-hidden"
						>
							<div class="text-4xl mb-4">👑</div>
							<div class="mb-2">${t('localGame.tournament')}</div>
							<div class="font-['Orbitron'] text-sm text-gray-300">${t('localGame.tournamentDesc')}</div>
						</button>
					</div>

					<!-- Back Button -->
					<div class="text-center mt-12">
						<button 
							id="back-btn"
							class="border-2 border-gray-500 text-gray-300 py-3 px-8 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:border-gray-400 hover:text-white"
						>
							${t('gameConfig.back')}
						</button>
					</div>
				</div>
			</div>
		`;

		// Event listeners
		const btn1v1 = container.querySelector('#one-vs-one-btn');
		const btnTournament = container.querySelector('#tournament-btn');
		const btnBack = container.querySelector('#back-btn');

		btn1v1?.addEventListener('click', () => {
			selectedGameMode = 'standard';
			currentMode = 'lobby-selection';
			renderLobbySelection();
		});

		btnTournament?.addEventListener('click', () => {
			selectedGameMode = 'tournament';
			currentMode = 'lobby-selection';
			renderLobbySelection();
		});

		btnBack?.addEventListener('click', () => {
			navigate('lobby');
		});
	};

	const renderLobbySelection = () => {
		container.innerHTML = `
			<div class="crt-screen relative min-h-screen bg-gradient-to-b from-gray-900 to-black flicker">
				<div class="container mx-auto px-4 py-8">
					<header class="text-center mb-12">
						<h1 class="font-['Press_Start_2P'] text-4xl md:text-6xl neon-text mb-4 text-white">
							${t('multiplayer.title')}
						</h1>
						<div class="font-['Orbitron'] text-lg md:text-xl text-[#F34C94]">
							${t('multiplayer.subtitle')}
						</div>
					</header>

					<div class="flex flex-col gap-6 max-w-3xl mx-auto">
						<!-- Random Play -->
						<button 
							id="random-play-btn"
							class="w-full border-2 border-[#F34C94] text-white py-6 px-6 rounded-lg font-['Press_Start_2P'] text-base md:text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(243,76,148,0.6)] bg-gradient-to-r from-[#4B1B67] to-[#872481] relative overflow-hidden"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-4">
									<div class="text-3xl">🎲</div>
									<div class="text-left">
										<div class="mb-1">${t('multiplayer.randomPlay')}</div>
										<div class="font-['Orbitron'] text-sm text-gray-300">${t('multiplayer.randomPlayDesc')}</div>
									</div>
								</div>
								<div class="text-2xl">→</div>
							</div>
						</button>

						<!-- Create Lobby -->
						<button 
							id="create-lobby-btn"
							class="w-full border-2 border-[#F34C94] text-white py-6 px-6 rounded-lg font-['Press_Start_2P'] text-base md:text-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(243,76,148,0.6)] bg-gradient-to-r from-[#872481] to-[#DC25A3] relative overflow-hidden"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-4">
									<div class="text-3xl">➕</div>
									<div class="text-left">
										<div class="mb-1">${t('multiplayer.createLobby')}</div>
										<div class="font-['Orbitron'] text-sm text-gray-300">${t('multiplayer.createLobbyDesc')}</div>
									</div>
								</div>
								<div class="text-2xl">→</div>
							</div>
						</button>

						<!-- Join Lobby -->
						<div class="w-full border-2 border-[#F34C94] bg-gray-900/80 backdrop-blur-md rounded-lg p-6">
							<div class="mb-4">
								<div class="flex items-center gap-4 mb-2">
									<div class="text-3xl">🔗</div>
									<div class="font-['Press_Start_2P'] text-base md:text-lg text-white">
										${t('multiplayer.joinLobby')}
									</div>
								</div>
								<div class="font-['Orbitron'] text-sm text-gray-300 ml-12">
									${t('multiplayer.joinLobbyDesc')}
								</div>
							</div>
							<div class="flex gap-2">
								<input 
									type="text" 
									id="lobby-id-input" 
									placeholder="${t('multiplayer.enterGameId')}"
									class="flex-1 py-3 px-4 bg-gray-800 border-2 border-[#F34C94]/30 rounded-lg text-white placeholder-gray-400 focus:border-[#F34C94] focus:outline-none focus:shadow-[0_0_10px_rgba(243,76,148,0.3)] font-['Orbitron']"
								/>
								<button 
									id="join-lobby-btn"
									class="border-2 border-[#F34C94] text-white py-3 px-8 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(243,76,148,0.5)] bg-gradient-to-r from-[#DC25A3] to-[#F34C94]"
								>
									${t('multiplayer.join')}
								</button>
							</div>
						</div>
					</div>

					<!-- Back Button -->
					<div class="text-center mt-12">
						<button 
							id="back-btn"
							class="border-2 border-gray-500 text-gray-300 py-3 px-8 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:border-gray-400 hover:text-white"
						>
							${t('gameConfig.back')}
						</button>
					</div>
				</div>
			</div>
		`;

		// Event listeners
		const btnRandom = container.querySelector('#random-play-btn');
		const btnCreate = container.querySelector('#create-lobby-btn');
		const btnJoin = container.querySelector('#join-lobby-btn');
		const inputLobbyId = container.querySelector('#lobby-id-input') as HTMLInputElement;
		const btnBack = container.querySelector('#back-btn');

		btnRandom?.addEventListener('click', async () => {
			currentMode = 'loading';
			renderLoading();
			
			try {
				const result = await mockRandomMatchmaking();
				if (result.success && result.matchId) {
					sessionStorage.setItem('matchId', result.matchId);
					sessionStorage.setItem('gameMode', selectedGameMode);
					navigate('game');
				} else {
					alert(result.error || 'Failed to find match');
					currentMode = 'lobby-selection';
					renderLobbySelection();
				}
			} catch (error) {
				alert('Error during matchmaking');
				currentMode = 'lobby-selection';
				renderLobbySelection();
			}
		});

		btnCreate?.addEventListener('click', () => {
			currentMode = 'config-create';
			renderConfig();
		});

		btnJoin?.addEventListener('click', async () => {
			const lobbyId = inputLobbyId?.value.trim();
			if (!lobbyId) {
				alert('Please enter a game ID');
				return;
			}

			currentMode = 'loading';
			renderLoading();

			try {
				const result = await mockJoinLobby(lobbyId);
				if (result.success) {
					sessionStorage.setItem('lobbyId', lobbyId);
					navigate('game');
				} else {
					alert(result.error || 'Failed to join lobby');
					currentMode = 'lobby-selection';
					renderLobbySelection();
				}
			} catch (error) {
				alert('Error joining lobby');
				currentMode = 'lobby-selection';
				renderLobbySelection();
			}
		});

		// Allow Enter key to join lobby
		inputLobbyId?.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				btnJoin?.click();
			}
		});

		btnBack?.addEventListener('click', () => {
			currentMode = 'mode-selection';
			renderModeSelection();
		});
	};

	const renderConfig = () => {
		container.innerHTML = `
			<div class="crt-screen relative min-h-screen bg-gradient-to-b from-gray-900 to-black flicker">
				<div class="container mx-auto px-4 py-8">
					<header class="text-center mb-8">
						<h1 class="font-['Press_Start_2P'] text-3xl md:text-5xl neon-text mb-4 text-white">
							${t('gameConfig.title')}
						</h1>
					</header>

					<div class="max-w-2xl mx-auto" id="game-config-container"></div>
				</div>
			</div>
		`;

		const configContainer = container.querySelector('#game-config-container');
		if (configContainer) {
			const gameConfig = GameConfig({
				mode: selectedGameMode,
				isMultiplayer: true,
				numPlayers: selectedGameMode === 'tournament' ? 2 : 2,
				onSubmit: async (config: GameConfigType) => {
					currentMode = 'loading';
					renderLoading();

					try {
						const result = await mockCreateLobby(config);
						if (result.success && result.lobbyId) {
							config.lobbyId = result.lobbyId;
							sessionStorage.setItem('gameConfig', JSON.stringify(config));
							sessionStorage.setItem('lobbyId', result.lobbyId);
							sessionStorage.setItem('gameMode', selectedGameMode);
							navigate('game');
						} else {
							alert(result.error || 'Failed to create lobby');
							currentMode = 'config-create';
							renderConfig();
						}
					} catch (error) {
						alert('Error creating lobby');
						currentMode = 'config-create';
						renderConfig();
					}
				},
				onCancel: () => {
					currentMode = 'lobby-selection';
					renderLobbySelection();
				}
			});
			configContainer.appendChild(gameConfig);
		}
	};

	const renderLoading = () => {
		container.innerHTML = '';
		const loadingComponent = LoadingPong();
		container.appendChild(loadingComponent);
	};

	renderModeSelection();

	return container;
}

