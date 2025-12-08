export function createMatchmakingStyles(): string {
	return `
		<style>
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
		</style>
	`;
}

export function injectMatchmakingStyles(): void {
	const existingStyle = document.getElementById('matchmaking-styles');
	if (existingStyle) {
		return;
	}

	const style = document.createElement('style');
	style.id = 'matchmaking-styles';
	style.textContent = createMatchmakingStyles().replace(/<\/?style>/g, '');
	document.head.appendChild(style);
}
