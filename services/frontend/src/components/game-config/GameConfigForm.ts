import { t } from '../../i18n';
import type { GameConfig as GameConfigType } from 'shared/index';
import { escapeHtml } from '../../utils/sanitize';
import { typography, effects, gradients } from '../../styles/theme';
import { createPaddleSpeedControl, setupPaddleSpeedControl } from './PaddleSpeedControl';
import { createPlayerSetup, setupPlayerSetup } from './PlayerSetup';

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

	// State management
	let paddleColors: string[] = mode === 'tournament'
		? ['#DC25A3', '#F34C94']
		: ['#DC25A3', '#F34C94'];
	let paddleSpeed = 5;
	let ballColor = '#F34C94';
	let ballSpeed = 50;
	let backgroundColor = '#000000';
	let pointsToWin = 5;
	let playerNames: string[] = !isMultiplayer
		? (mode === 'tournament' ? Array(2).fill('') : Array(2).fill(''))
		: [];
	let isPrivate = false;

	const render = () => {
		try {
			container.innerHTML = `
				<div class="bg-black/40 backdrop-blur-md border-2 border-white/40 rounded-lg p-6 space-y-6">
					<!-- Player Names & Colors -->
					${createPlayerSetup(playerNames, paddleColors, mode, isMultiplayer)}

					<!-- Paddle Speed -->
					${createPaddleSpeedControl(t('gameConfig.paddleSpeed'), paddleSpeed)}

					<!-- Ball Speed -->
					<div>
						<label class="block text-white text-sm mb-2">${escapeHtml(t('gameConfig.ballSpeed'))}</label>
						<input
							type="range"
							id="ball-speed-slider"
							min="10"
							max="100"
							value="${ballSpeed}"
							class="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
						/>
						<div class="text-center text-white text-sm mt-1">
							<span id="ball-speed-value">${ballSpeed}</span>%
						</div>
					</div>

					<!-- Points to Win -->
					<div>
						<label class="block text-white text-sm mb-2">${escapeHtml(t('gameConfig.pointsToWin'))}</label>
						<input
							type="number"
							id="points-input"
							value="${pointsToWin}"
							min="1"
							max="21"
							class="w-full py-2 px-4 bg-black/60 border-2 border-white/30 rounded-lg text-white focus:border-white/60 focus:outline-none focus:shadow-[0_0_10px_rgba(255,255,255,0.3)] ${typography.body}"
						/>
					</div>

					<!-- Ball Color -->
					<div>
						<label class="block text-white text-sm mb-2">${escapeHtml(t('gameConfig.ballColor'))}</label>
						<input
							type="color"
							id="ball-color-input"
							value="${escapeHtml(ballColor)}"
							class="w-full h-12 rounded border-2 border-white/40 cursor-pointer bg-black/40"
						/>
					</div>

					<!-- Background Color -->
					<div>
						<label class="block text-white text-sm mb-2">${escapeHtml(t('gameConfig.backgroundColor'))}</label>
						<input
							type="color"
							id="background-color-input"
							value="${escapeHtml(backgroundColor)}"
							class="w-full h-12 rounded border-2 border-white/40 cursor-pointer bg-black/40"
						/>
					</div>

					${isMultiplayer ? `
						<!-- Lobby Type -->
						<div>
							<label class="block text-white text-sm mb-2">${escapeHtml(t('gameConfig.lobbyType'))}</label>
							<div class="flex gap-4">
								<label class="flex items-center gap-2 text-white cursor-pointer">
									<input
										type="radio"
										name="lobby-type"
										value="public"
										${!isPrivate ? 'checked' : ''}
										class="cursor-pointer"
									/>
									<span>${escapeHtml(t('gameConfig.public'))}</span>
								</label>
								<label class="flex items-center gap-2 text-white cursor-pointer">
									<input
										type="radio"
										name="lobby-type"
										value="private"
										${isPrivate ? 'checked' : ''}
										class="cursor-pointer"
									/>
									<span>${escapeHtml(t('gameConfig.private'))}</span>
								</label>
							</div>
						</div>
					` : ''}

					<!-- Action Buttons -->
					<div class="flex gap-4 pt-4">
						<button
							id="cancel-btn"
							class="flex-1 border-2 border-white/30 text-white py-3 px-6 rounded-lg ${typography.button} text-sm ${effects.transition.all} hover:border-white/60 bg-black/40"
						>
							${escapeHtml(t('gameConfig.back'))}
						</button>
						<button
							id="submit-btn"
							class="flex-1 border-2 border-white/50 text-white py-3 px-6 rounded-lg ${typography.button} text-sm ${effects.transition.all} hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.5)] ${gradients.buttons.createLobby}"
						>
							${escapeHtml(isMultiplayer ? t('gameConfig.createLobby') : t('gameConfig.startGame'))}
						</button>
					</div>
				</div>
			`;

			setupEventListeners();
		} catch (error) {
			console.error('Error rendering game config:', error);
			container.innerHTML = `
				<div class="text-center text-white p-8">
					<p class="${typography.subtitle}">Error loading game configuration</p>
				</div>
			`;
		}
	};


	const setupEventListeners = () => {
		// Setup player names and colors
		setupPlayerSetup(
			container,
			playerNames,
			paddleColors,
			mode,
			isMultiplayer,
			(index: number, name: string) => {
				playerNames[index] = name;
			},
			(index: number, color: string) => {
				paddleColors[index] = color;
			},
			() => {
				// Add player
				if (paddleColors.length < 6) {
					saveCurrentState();
					const defaultColors = ['#DC25A3', '#F34C94', '#00FFFF', '#FF00FF', '#FFFF00', '#00FF00'];
					paddleColors.push(defaultColors[paddleColors.length] || '#DC25A3');
					if (!isMultiplayer) {
						playerNames.push('');
					}
					render();
				}
			},
			(index: number) => {
				// Remove player
				if (paddleColors.length > 2) {
					saveCurrentState();
					paddleColors.splice(index, 1);
					if (!isMultiplayer) {
						playerNames.splice(index, 1);
					}
					render();
				}
			}
		);

		// Setup paddle speed
		setupPaddleSpeedControl(container, (speed: number) => {
			paddleSpeed = speed;
		});

		setTimeout(() => {
			// Ball speed slider
			const ballSpeedSlider = container.querySelector('#ball-speed-slider') as HTMLInputElement;
			const ballSpeedValue = container.querySelector('#ball-speed-value');
			if (ballSpeedSlider && ballSpeedValue) {
				ballSpeedSlider.addEventListener('input', () => {
					ballSpeed = parseInt(ballSpeedSlider.value);
					ballSpeedValue.textContent = ballSpeed.toString();
				});
			}

			// Points to win input
			const pointsInput = container.querySelector('#points-input') as HTMLInputElement;
			if (pointsInput) {
				pointsInput.addEventListener('input', () => {
					const value = parseInt(pointsInput.value);
					if (value >= 1 && value <= 21) {
						pointsToWin = value;
					}
				});
			}

			// Ball color input
			const ballColorInput = container.querySelector('#ball-color-input') as HTMLInputElement;
			if (ballColorInput) {
				ballColorInput.addEventListener('input', () => {
					ballColor = ballColorInput.value;
				});
			}

			// Background color input
			const bgColorInput = container.querySelector('#background-color-input') as HTMLInputElement;
			if (bgColorInput) {
				bgColorInput.addEventListener('input', () => {
					backgroundColor = bgColorInput.value;
				});
			}

			// Lobby type radio buttons (multiplayer only)
			if (isMultiplayer) {
				const lobbyTypeRadios = container.querySelectorAll('input[name="lobby-type"]');
				lobbyTypeRadios.forEach(radio => {
					radio.addEventListener('change', (e) => {
						const target = e.target as HTMLInputElement;
						isPrivate = target.value === 'private';
					});
				});
			}

			// Action buttons
			const cancelBtn = container.querySelector('#cancel-btn');
			const submitBtn = container.querySelector('#submit-btn');

			if (!cancelBtn || !submitBtn) {
				console.warn('Action buttons not found in DOM');
				return;
			}

			cancelBtn.addEventListener('click', (e) => {
				e.preventDefault();
				try {
					onCancel();
				} catch (error) {
					console.error('Error in cancel handler:', error);
				}
			});

			submitBtn.addEventListener('click', (e) => {
				e.preventDefault();
				try {
					handleSubmit();
				} catch (error) {
					console.error('Error in submit handler:', error);
				}
			});
		}, 0);
	};

	const saveCurrentState = () => {
		// Save paddle colors
		paddleColors.forEach((_, index) => {
			const input = container.querySelector(`#paddle-color-${index}-input`) as HTMLInputElement;
			if (input) {
				paddleColors[index] = input.value;
			}
		});
		// Save player names for local games
		if (!isMultiplayer) {
			playerNames.forEach((_, index) => {
				const input = container.querySelector(`#player-${index}-input`) as HTMLInputElement;
				if (input) {
					playerNames[index] = input.value.trim();
				}
			});
		}
	};

	const handleSubmit = () => {
		try {
			// Save current state before validation
			saveCurrentState();

			// For local games, use default names if empty
			if (!isMultiplayer) {
				playerNames = playerNames.map((name, index) => {
					const trimmed = name.trim();
					return trimmed || `Player ${index + 1}`;
				});
			}

			// Create config
			const paddleConfig = { color: paddleColors[0], speed: paddleSpeed };

			const config: GameConfigType = {
				paddleConfig: paddleConfig,
				ballConfig: {
					color: ballColor,
					speed: ballSpeed * 2
				},
				playerNames: !isMultiplayer ? playerNames : [],
				backgroundColor: backgroundColor,
				pointsToWin: pointsToWin,
				isPrivate: isPrivate,
				mode: mode,
				numPlayers: mode === 'tournament' ? paddleColors.length : undefined
			};

			onSubmit(config);
		} catch (error) {
			console.error('Error submitting game config:', error);
			alert('Error creating game configuration');
		}
	};

	render();

	return container;
}

