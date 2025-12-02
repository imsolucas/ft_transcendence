import { gradients, typography, spacing, effects } from '../../styles/theme';
import { escapeHtml } from '../../utils/sanitize';

export function createCTAButtons(playNowText: string): string {
  return `
    <div class="${spacing.section}">
      <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button class="play-now-btn ${gradients.buttonPrimary} ${gradients.buttonPrimaryHover} text-white px-8 py-4 ${effects.rounded.full} ${typography.sizes.buttonSize} ${typography.weights.semibold} ${effects.transitions.button} ${effects.shadow.button} ${typography.fonts.primary}">
          ${escapeHtml(playNowText)}
        </button>
      </div>
    </div>
  `;
}

export function setupCTAButtons(container: HTMLElement, onPlayNow: () => void): void {
  // Use setTimeout to ensure DOM is ready, but also add safety checks
  const setupButtons = () => {
    const playNowBtn = container.querySelector('.play-now-btn');

    if (!playNowBtn) {
      console.warn('Play now button not found in container');
      return;
    }

    playNowBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        onPlayNow();
      } catch (error) {
        console.error('Error in play now handler:', error);
      }
    });
  };

  // Try immediate setup first, fallback to timeout
  if (container.querySelector('.play-now-btn')) {
    setupButtons();
  } else {
    setTimeout(setupButtons, 0);
  }
}
