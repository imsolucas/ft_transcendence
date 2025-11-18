import { t } from '../i18n';
import { navigate } from '../router';
import { GameConfig } from '../components/GameConfig';
import type { GameConfig as GameConfigType } from '../types/game';

type LocalGameMode = 'selection' | 'config-1v1' | 'config-tournament';

export function LocalGamePage(): HTMLElement {
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

	let currentMode: LocalGameMode = 'selection';

	const renderSelection = () => {
		container.innerHTML = `
			<div class="crt-screen relative min-h-screen bg-gradient-to-b from-gray-900 to-black flicker">
				<div class="container mx-auto px-4 py-8">
					<header class="text-center mb-12">
						<h1 class="font-['Press_Start_2P'] text-4xl md:text-6xl neon-text mb-4 text-white">
							${t('localGame.title')}
						</h1>
						<div class="font-['Orbitron'] text-lg md:text-xl text-[#F34C94]">
							${t('localGame.subtitle')}
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
			currentMode = 'config-1v1';
			renderConfig('standard');
		});

		btnTournament?.addEventListener('click', () => {
			currentMode = 'config-tournament';
			renderConfig('tournament');
		});

		btnBack?.addEventListener('click', () => {
			navigate('lobby');
		});
	};

	const renderConfig = (mode: 'standard' | 'tournament') => {
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
				mode: mode,
				isMultiplayer: false,
				onSubmit: (config: GameConfigType) => {
					// Store config in sessionStorage
					sessionStorage.setItem('gameConfig', JSON.stringify(config));
					// Navigate to game (will be implemented later)
					console.log('Game config:', config);
					// For now, just show alert
					alert('Game configuration saved! Game implementation coming soon.');
					navigate('lobby');
				},
				onCancel: () => {
					currentMode = 'selection';
					renderSelection();
				}
			});
			configContainer.appendChild(gameConfig);
		}
	};

	renderSelection();

	return container;
}

