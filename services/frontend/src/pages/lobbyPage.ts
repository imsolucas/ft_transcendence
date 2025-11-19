import { navigate } from "../router";

import { AddFriend } from '../components/AddFriend';
import { t } from '../i18n';
import { fetchUserProfile } from '../utils/api';

export function LobbyPage(): HTMLElement {
	const container = document.createElement('div');

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

		@keyframes ripple {
			to {
				transform: scale(4);
				opacity: 0;
			}
		}

		.neon-text {
			animation: neon-glow 2s ease-in-out infinite alternate;
		}
	`;
	document.head.appendChild(style);

	container.innerHTML = `
		<!-- Main Container -->
		<div class="relative min-h-screen bg-gradient-to-b from-gray-900 to-black">
			<!-- Main Container -->
			<div class="container mx-auto px-4 py-8">
				<!-- Header -->
				<header class="text-center mt-16 mb-8">
					<h1 class="font-['Press_Start_2P'] text-4xl md:text-6xl neon-text mb-4 text-white">
						${t('lobby.title')}
					</h1>
					<div class="font-['Orbitron'] text-lg md:text-xl text-[#F34C94]">
						${t('lobby.subtitle')}
					</div>
				</header>

				<!-- Main Content -->
				<div class="max-w-2xl mx-auto">
					<!-- Game Mode Buttons -->
					<div class="space-y-4 mb-8">
						<h2 class="font-['Orbitron'] text-xl mb-4 text-[#F34C94]">${t('lobby.gameModes')}</h2>
						
						<button class="neon-button localBtn w-full border-2 border-[#F34C94] text-white py-4 px-6 rounded-lg font-['Press_Start_2P'] text-sm md:text-base transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(243,76,148,0.5)] relative overflow-hidden bg-gradient-to-r from-[#4B1B67] to-[#872481]">
							🎮 ${t('lobby.localGame')}
						</button>
						
						<button class="neon-button multiplayerBtn w-full border-2 border-[#F34C94] text-white py-4 px-6 rounded-lg font-['Press_Start_2P'] text-sm md:text-base transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(243,76,148,0.5)] relative overflow-hidden bg-gradient-to-r from-[#872481] to-[#DC25A3]">
							🌐 ${t('lobby.multiplayer')}
						</button>
					</div>

					<!-- Quick Stats -->
					<div class="space-y-4 mb-8">
						<div class="flex items-center justify-between">
							<h2 class="font-['Orbitron'] text-xl mb-4 text-[#F34C94]">${t('lobby.quickStats')}</h2>
							<button id="refresh-stats-btn" class="text-[#F34C94] hover:text-[#F34C94]/80 transition-colors mb-4" title="${t('lobby.refresh') || 'Refresh'}">
								<i class="bx bx-refresh text-xl"></i>
							</button>
						</div>
						
						<div class="bg-gray-900 border border-[#F34C94] p-4 rounded-lg">
							<div class="grid grid-cols-2 gap-4 text-center">
								<div>
									<div class="font-['Press_Start_2P'] text-xs text-[#F34C94]">${t('lobby.wins')}</div>
									<div id="lobby-wins" class="font-['Orbitron'] text-lg text-white">-</div>
								</div>
								<div>
									<div class="font-['Press_Start_2P'] text-xs text-[#F34C94]">${t('lobby.losses')}</div>
									<div id="lobby-losses" class="font-['Orbitron'] text-lg text-white">-</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Add Friends Section -->
					<div class="space-y-4">
						<div id="add-friend-container"></div>
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

	// Load stats and setup refresh functionality
	const loadStats = async () => {
		try {
			const profileData = await fetchUserProfile();
			const winsElement = container.querySelector('#lobby-wins');
			const lossesElement = container.querySelector('#lobby-losses');
			if (winsElement) winsElement.textContent = String(profileData.wins || 0);
			if (lossesElement) lossesElement.textContent = String(profileData.losses || 0);
		} catch (error) {
			console.error('Failed to load stats:', error);
			const winsElement = container.querySelector('#lobby-wins');
			const lossesElement = container.querySelector('#lobby-losses');
			if (winsElement) winsElement.textContent = '0';
			if (lossesElement) lossesElement.textContent = '0';
		}
	};

	// Store reference to AddFriend component for refresh
	let addFriendComponent: HTMLElement | null = null;

	setTimeout(() => {
		const localGame = container.querySelector('.localBtn');
		const multiplayerGame = container.querySelector('.multiplayerBtn');

		localGame?.addEventListener('click', () => {
			navigate('local-game');
		});

		multiplayerGame?.addEventListener('click', () => {
			navigate('multiplayer-game');
		});

		// Load initial stats
		loadStats();

		// Setup refresh stats button
		const refreshStatsBtn = container.querySelector('#refresh-stats-btn');
		refreshStatsBtn?.addEventListener('click', () => {
			const icon = refreshStatsBtn.querySelector('i');
			if (icon) {
				icon.classList.add('animate-spin');
				loadStats().finally(() => {
					setTimeout(() => {
						icon.classList.remove('animate-spin');
					}, 500);
				});
			}
		});

		// Add AddFriend component
		const addFriendContainer = container.querySelector('#add-friend-container');
		if (addFriendContainer) {
			addFriendComponent = AddFriend();
			addFriendContainer.appendChild(addFriendComponent);
		}
	}, 0);


	return container;
}
