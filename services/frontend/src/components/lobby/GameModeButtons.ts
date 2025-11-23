import { typography, effects } from '../../styles/theme';
import { escapeHtml } from '../../utils/sanitize';

interface GameModeButton {
  icon: string;
  text: string;
  className: string;
  gradient: 'local' | 'multiplayer';
}

export function createGameModeButtons(localText: string, multiplayerText: string, sectionTitle: string): string {
  const buttons: GameModeButton[] = [
    {
      icon: '🎮',
      text: escapeHtml(localText),
      className: 'local-game-btn',
      gradient: 'local',
    },
    {
      icon: '🌐',
      text: escapeHtml(multiplayerText),
      className: 'multiplayer-game-btn',
      gradient: 'multiplayer',
    },
  ];

  const localGradient = 'bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-800 hover:to-blue-800';
  const multiplayerGradient = 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800';

  return `
    <div class="space-y-4 mb-8">
      <h2 class="${typography.sizes.sectionTitle} ${typography.fonts.primary} mb-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        ${escapeHtml(sectionTitle)}
      </h2>

      ${buttons.map(btn => `
        <button class="${btn.className} w-full text-white py-4 px-6 ${effects.rounded['2xl']} ${typography.sizes.buttonSize} ${typography.weights.semibold} ${effects.transitions.button} ${effects.shadow.button} ${typography.fonts.primary} ${btn.gradient === 'local' ? localGradient : multiplayerGradient} border-2 border-white/50 hover:border-white/80">
          <span class="mr-2">${btn.icon}</span>
          ${btn.text}
        </button>
      `).join('')}
    </div>
  `;
}

export function setupGameModeButtons(container: HTMLElement, onLocal: () => void, onMultiplayer: () => void): void {
  const setupButtons = () => {
    const localBtn = container.querySelector('.local-game-btn');
    const multiplayerBtn = container.querySelector('.multiplayer-game-btn');

    if (!localBtn || !multiplayerBtn) {
      console.warn('Game mode buttons not found in container');
      return;
    }

    const handleLocal = (e: Event) => {
      e.preventDefault();
      try {
        onLocal();
      } catch (error) {
        console.error('Error in local game handler:', error);
      }
    };

    const handleMultiplayer = (e: Event) => {
      e.preventDefault();
      try {
        onMultiplayer();
      } catch (error) {
        console.error('Error in multiplayer game handler:', error);
      }
    };

    localBtn.addEventListener('click', handleLocal, { once: false });
    multiplayerBtn.addEventListener('click', handleMultiplayer, { once: false });
  };

  if (container.querySelector('.local-game-btn')) {
    setupButtons();
  } else {
    setTimeout(setupButtons, 0);
  }
}
