import { t } from '../i18n';
import type { GameConfig as GameConfigType } from 'shared/index';

interface GameConfigProps {
	mode: 'tournament' | 'standard';
	isMultiplayer?: boolean;
	numPlayers?: number;
	onSubmit: (config: GameConfigType) => void;
	onCancel: () => void;
}

export function GameConfig({ mode, isMultiplayer = false, onSubmit, onCancel }: GameConfigProps): HTMLElement {
	const container = document.createElement('div');
	container.className = 'w-full';

	// Default values
	// For local games: single paddle config, for multiplayer: per-player paddle colors
	// Tournament mode starts with 2 players (can add up to 8)
	let paddleColors: string[] = mode === 'tournament' 
		? ['#DC25A3', '#F34C94'] // Start with 2 players for tournament
		: ['#DC25A3', '#F34C94']; // Two colors for standard
	let paddleSpeed = 5;
	let ballColor = '#F34C94';
	let ballSpeed = 50;
	let backgroundColor = '#000000';
	let pointsToWin = 5;
	// Player names only for local games - start with 2, will adjust dynamically for tournament
	let playerNames: string[] = !isMultiplayer 
		? (mode === 'tournament' ? Array(2).fill('') : Array(2).fill(''))
		: [];
	let isPrivate = false;

	const render = () => {
		container.innerHTML = `
			<div class="bg-gray-900/90 backdrop-blur-md border-2 border-[#F34C94] rounded-lg p-6 space-y-6">
				<h2 class="font-['Press_Start_2P'] text-2xl md:text-3xl text-[#F34C94] mb-6 text-center">
					${t('gameConfig.title')}
				</h2>

				<!-- Paddle Speed (shared for all players) -->
				<div class="space-y-4">
					<h3 class="font-['Orbitron'] text-lg text-[#F34C94]">${t('gameConfig.paddleSpeed')}</h3>
					<div class="flex items-center gap-4">
						<div class="flex-1">
							<input 
								type="range" 
								id="paddle-speed-input" 
								min="1" 
								max="10" 
								value="${paddleSpeed}"
								class="w-full"
							/>
							<div class="text-right text-[#F34C94] text-sm mt-1" id="paddle-speed-value">${paddleSpeed}</div>
						</div>
					</div>
				</div>

				<!-- Tournament: Number of Players (for tournament mode - local and multiplayer) -->
				${mode === 'tournament' ? `
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h3 class="font-['Orbitron'] text-lg text-[#F34C94]">${t('gameConfig.numPlayers')}</h3>
							${paddleColors.length < 8 ? `
								<button 
									type="button"
									id="add-player-btn"
									class="border-2 border-[#F34C94] text-[#F34C94] py-2 px-4 rounded-lg font-['Press_Start_2P'] text-xs transition-all duration-300 hover:bg-[#F34C94] hover:text-white hover:shadow-[0_0_10px_rgba(243,76,148,0.5)]"
								>
									+ ${t('gameConfig.addPlayer') || 'Add Player'}
								</button>
							` : ''}
						</div>
						<div class="text-white text-sm">
							Current: ${paddleColors.length} players (max 8)
						</div>
					</div>
				` : ''}

				<!-- Paddle Colors (per player) -->
				<div class="space-y-4">
					<h3 class="font-['Orbitron'] text-lg text-[#F34C94]">${isMultiplayer ? 'Player Paddle Colors' : t('gameConfig.paddleColor')}</h3>
					<div class="flex flex-col gap-3">
						${(mode === 'tournament' 
							? paddleColors 
							: paddleColors.slice(0, 2)
						).map((color, index) => `
							<div class="flex items-center gap-2">
								<label class="text-white text-sm w-24">${!isMultiplayer ? t('gameConfig.playerName', { num: index + 1 }) : `Player ${index + 1}`}:</label>
								<input 
									type="color" 
									id="paddle-color-${index}-input" 
									value="${color}"
									class="w-20 h-12 rounded border-2 border-[#F34C94] cursor-pointer"
								/>
								${mode === 'tournament' && paddleColors.length > 2 ? `
									<button 
										type="button"
										class="remove-player-btn border-2 border-red-500 text-red-500 py-2 px-3 rounded-lg font-['Press_Start_2P'] text-xs transition-all duration-300 hover:bg-red-500 hover:text-white"
										data-player-index="${index}"
									>
										✕
									</button>
								` : ''}
							</div>
						`).join('')}
					</div>
				</div>

				<!-- Ball Configuration -->
				<div class="space-y-4">
					<h3 class="font-['Orbitron'] text-lg text-[#F34C94]">${t('gameConfig.ballColor')}</h3>
					<div class="flex items-center gap-4">
						<input 
							type="color" 
							id="ball-color-input" 
							value="${ballColor}"
							class="w-20 h-12 rounded border-2 border-[#F34C94] cursor-pointer"
						/>
						<div class="flex-1">
							<label class="block text-white text-sm mb-2">${t('gameConfig.ballSpeed')}</label>
							<input 
								type="range" 
								id="ball-speed-input" 
								min="0" 
								max="100" 
								value="${ballSpeed}"
								class="w-full"
							/>
							<div class="text-right text-[#F34C94] text-sm mt-1" id="ball-speed-value">${ballSpeed}</div>
						</div>
					</div>
				</div>

				<!-- Background Color -->
				<div class="space-y-4">
					<h3 class="font-['Orbitron'] text-lg text-[#F34C94]">${t('gameConfig.backgroundColor')}</h3>
					<input 
						type="color" 
						id="bg-color-input" 
						value="${backgroundColor}"
						class="w-full h-12 rounded border-2 border-[#F34C94] cursor-pointer"
					/>
				</div>

				<!-- Points to Win -->
				<div class="space-y-4">
					<label class="block font-['Orbitron'] text-lg text-[#F34C94]">${t('gameConfig.pointsToWin')}</label>
					<input 
						type="number" 
						id="points-input" 
						min="1" 
						max="50" 
						value="${pointsToWin}"
						class="w-full py-2 px-4 bg-gray-800 border-2 border-[#F34C94]/30 rounded-lg text-white focus:border-[#F34C94] focus:outline-none focus:shadow-[0_0_10px_rgba(243,76,148,0.3)]"
					/>
				</div>


				<!-- Multiplayer: Lobby Type -->
				${isMultiplayer ? `
					<div class="space-y-4">
						<label class="block font-['Orbitron'] text-lg text-[#F34C94]">${t('gameConfig.lobbyType')}</label>
						<div class="flex gap-4">
							<label class="flex items-center gap-2 cursor-pointer">
								<input 
									type="radio" 
									name="lobby-type" 
									value="public" 
									${!isPrivate ? 'checked' : ''}
									class="w-5 h-5 text-[#F34C94] focus:ring-[#F34C94]"
								/>
								<span class="text-white">${t('gameConfig.public')}</span>
							</label>
							<label class="flex items-center gap-2 cursor-pointer">
								<input 
									type="radio" 
									name="lobby-type" 
									value="private" 
									${isPrivate ? 'checked' : ''}
									class="w-5 h-5 text-[#F34C94] focus:ring-[#F34C94]"
								/>
								<span class="text-white">${t('gameConfig.private')}</span>
							</label>
						</div>
					</div>
				` : ''}

				<!-- Player Names (only for local games) -->
				${!isMultiplayer ? `
					<div class="space-y-4" id="player-names-container">
						<h3 class="font-['Orbitron'] text-lg text-[#F34C94]">Player Names</h3>
						${playerNames.map((name, index) => `
							<div>
								<label class="block text-white text-sm mb-2">${t('gameConfig.playerName', { num: index + 1 })}</label>
								<input 
									type="text" 
									id="player-${index}-input" 
									value="${name}"
									placeholder="Player ${index + 1}"
									class="w-full py-2 px-4 bg-gray-800 border-2 border-[#F34C94]/30 rounded-lg text-white placeholder-gray-400 focus:border-[#F34C94] focus:outline-none focus:shadow-[0_0_10px_rgba(243,76,148,0.3)]"
								/>
							</div>
						`).join('')}
					</div>
				` : ''}

				<!-- Action Buttons -->
				<div class="flex gap-4 pt-4">
					<button 
						id="cancel-btn" 
						class="flex-1 border-2 border-gray-500 text-gray-300 py-3 px-6 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:border-gray-400 hover:text-white"
					>
						${t('gameConfig.back')}
					</button>
					<button 
						id="submit-btn" 
						class="flex-1 border-2 border-[#F34C94] text-white py-3 px-6 rounded-lg font-['Press_Start_2P'] text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(243,76,148,0.5)] bg-gradient-to-r from-[#872481] to-[#DC25A3]"
					>
						${isMultiplayer ? t('gameConfig.createLobby') : t('gameConfig.startGame')}
					</button>
				</div>
			</div>
		`;

		// Event listeners
		setupEventListeners();
	};
	

	const setupEventListeners = () => {
		// Paddle speed slider
		const paddleSpeedInput = container.querySelector('#paddle-speed-input') as HTMLInputElement;
		const paddleSpeedValue = container.querySelector('#paddle-speed-value');
		if (paddleSpeedInput && paddleSpeedValue) {
			paddleSpeedInput.addEventListener('input', () => {
				paddleSpeed = parseInt(paddleSpeedInput.value);
				paddleSpeedValue.textContent = String(paddleSpeed);
			});
		}

		// Ball speed slider
		const ballSpeedInput = container.querySelector('#ball-speed-input') as HTMLInputElement;
		const ballSpeedValue = container.querySelector('#ball-speed-value');
		if (ballSpeedInput && ballSpeedValue) {
			ballSpeedInput.addEventListener('input', () => {
				ballSpeed = parseInt(ballSpeedInput.value);
				ballSpeedValue.textContent = String(ballSpeed);
			});
		}

		// Per-player paddle color inputs (handle all existing colors)
		const numColorsToHandle = mode === 'tournament' ? paddleColors.length : 2;
		for (let index = 0; index < numColorsToHandle; index++) {
			const paddleColorInput = container.querySelector(`#paddle-color-${index}-input`) as HTMLInputElement;
			if (paddleColorInput) {
				paddleColorInput.addEventListener('input', () => {
					paddleColors[index] = paddleColorInput.value;
				});
			}
		}

		// Ball and background color inputs
		const ballColorInput = container.querySelector('#ball-color-input') as HTMLInputElement;
		const bgColorInput = container.querySelector('#bg-color-input') as HTMLInputElement;

		if (ballColorInput) {
			ballColorInput.addEventListener('input', () => {
				ballColor = ballColorInput.value;
			});
		}

		if (bgColorInput) {
			bgColorInput.addEventListener('input', () => {
				backgroundColor = bgColorInput.value;
			});
		}

		// Points input
		const pointsInput = container.querySelector('#points-input') as HTMLInputElement;
		if (pointsInput) {
			pointsInput.addEventListener('input', () => {
				pointsToWin = parseInt(pointsInput.value) || 5;
			});
		}

		// Tournament: Add/Remove player buttons (for tournament mode - local and multiplayer)
		if (mode === 'tournament') {
			const addPlayerBtn = container.querySelector('#add-player-btn');
			addPlayerBtn?.addEventListener('click', () => {
				if (paddleColors.length < 4) {
					// Save current paddle colors
					paddleColors.forEach((_, index) => {
						const input = container.querySelector(`#paddle-color-${index}-input`) as HTMLInputElement;
						if (input) {
							paddleColors[index] = input.value;
						}
					});
					// Save current player names (for local games)
					if (!isMultiplayer) {
						playerNames.forEach((_, index) => {
							const input = container.querySelector(`#player-${index}-input`) as HTMLInputElement;
							if (input) {
								playerNames[index] = input.value.trim();
							}
						});
					}
					// Add new player with default color
					const defaultColors = ['#DC25A3', '#F34C94', '#00FFFF', '#FF00FF', '#FFFF00', '#00FF00', '#FFA500', '#FF1493'];
					paddleColors.push(defaultColors[paddleColors.length] || '#DC25A3');
					// Add empty player name for local games
					if (!isMultiplayer) {
						playerNames.push('');
					}
					render(); // Re-render to show new player paddle color and name input
				}
			});

			// Remove player buttons
			const removePlayerBtns = container.querySelectorAll('.remove-player-btn');
			removePlayerBtns.forEach(btn => {
				btn.addEventListener('click', (e) => {
					// Save current paddle colors before removing
					paddleColors.forEach((_, index) => {
						const input = container.querySelector(`#paddle-color-${index}-input`) as HTMLInputElement;
						if (input) {
							paddleColors[index] = input.value;
						}
					});
					// Save current player names before removing (for local games)
					if (!isMultiplayer) {
						playerNames.forEach((_, index) => {
							const input = container.querySelector(`#player-${index}-input`) as HTMLInputElement;
							if (input) {
								playerNames[index] = input.value.trim();
							}
						});
					}
					const index = parseInt((e.target as HTMLElement).getAttribute('data-player-index') || '0');
					if (paddleColors.length > 2) {
						paddleColors.splice(index, 1);
						// Remove corresponding player name for local games
						if (!isMultiplayer) {
							playerNames.splice(index, 1);
						}
						render(); // Re-render to update paddle color inputs and player names
					}
				});
			});
		}

		// Multiplayer: Lobby type
		if (isMultiplayer) {
			const lobbyTypeInputs = container.querySelectorAll('input[name="lobby-type"]');
			lobbyTypeInputs.forEach(input => {
				input.addEventListener('change', (e) => {
					isPrivate = (e.target as HTMLInputElement).value === 'private';
				});
			});
		}

		// Player name inputs
		playerNames.forEach((_, index) => {
			const input = container.querySelector(`#player-${index}-input`) as HTMLInputElement;
			if (input) {
				input.addEventListener('input', () => {
					playerNames[index] = input.value.trim();
				});
			}
		});

		// Cancel button
		const cancelBtn = container.querySelector('#cancel-btn');
		cancelBtn?.addEventListener('click', () => {
			onCancel();
		});

		// Submit button
		const submitBtn = container.querySelector('#submit-btn');
		submitBtn?.addEventListener('click', () => {
			handleSubmit();
		});
	};

	const handleSubmit = () => {
		// Validate player names (only for local games)
		if (!isMultiplayer) {
			const hasEmptyNames = playerNames.some(name => !name.trim());
			if (hasEmptyNames) {
				alert('Please enter all player names');
				return;
			}
		}

		// Save current paddle colors before submitting
		const numColorsToSave = mode === 'tournament' ? paddleColors.length : 2;
		for (let index = 0; index < numColorsToSave; index++) {
			const input = container.querySelector(`#paddle-color-${index}-input`) as HTMLInputElement;
			if (input) {
				paddleColors[index] = input.value;
			}
		}

		// Save current player names before submitting (for local games)
		if (!isMultiplayer) {
			playerNames.forEach((_, index) => {
				const input = container.querySelector(`#player-${index}-input`) as HTMLInputElement;
				if (input) {
					playerNames[index] = input.value.trim();
				}
			});
		}

		// Create paddle config: array of configs (one per player) - each player gets their own color
		const paddleConfig = { color: paddleColors[0], speed: paddleSpeed};
		// const paddleConfig = paddleColors.slice(0, mode === 'tournament' ? paddleColors.length : 2)
		// 	.map(color => ({ color, speed: paddleSpeed }));

		const config: GameConfigType = {
			paddleConfig: paddleConfig,
			ballConfig: {
				color: ballColor,
				speed: ballSpeed * 2
			},
			playerNames: !isMultiplayer ? playerNames.map(name => name.trim()) : [],
			backgroundColor: backgroundColor,
			pointsToWin: pointsToWin,
			isPrivate: isPrivate,
			mode: mode,
			numPlayers: mode === 'tournament' ? paddleColors.length : undefined
		};

		onSubmit(config);
	};

	render();

	return container;
}

