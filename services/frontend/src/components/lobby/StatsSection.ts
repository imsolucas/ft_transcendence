import { typography, effects } from '../../styles/theme';
import { escapeHtml } from '../../utils/sanitize';

export function createStatsSection(winsText: string, lossesText: string, sectionTitle: string, refreshText: string): string {
  return `
    <div class="space-y-4 mb-8">
      <div class="flex items-center justify-between">
        <h2 class="${typography.sizes.sectionTitle} ${typography.fonts.primary} mb-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          ${escapeHtml(sectionTitle)}
        </h2>
        <button id="refresh-stats-btn" class="text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all mb-4 p-2 rounded-lg border border-white/30" title="${escapeHtml(refreshText)}">
          <i class="bx bx-refresh text-xl"></i>
        </button>
      </div>

      <div class="bg-black/40 backdrop-blur-md border-2 border-white/40 p-6 ${effects.rounded['2xl']} ${effects.shadow.xl}">
        <div class="grid grid-cols-2 gap-4 text-center">
          <div>
            <div class="${typography.fonts.primary} text-sm mb-2 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${typography.weights.semibold}">
              ${escapeHtml(winsText)}
            </div>
            <div id="lobby-wins" class="${typography.sizes.heroSubtitle} ${typography.fonts.primary} text-white ${typography.weights.bold}">
              -
            </div>
          </div>
          <div>
            <div class="${typography.fonts.primary} text-sm mb-2 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${typography.weights.semibold}">
              ${escapeHtml(lossesText)}
            </div>
            <div id="lobby-losses" class="${typography.sizes.heroSubtitle} ${typography.fonts.primary} text-white ${typography.weights.bold}">
              -
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function setupStatsSection(container: HTMLElement, loadStatsFn: () => Promise<void>): void {
  let isRefreshing = false;

  const setupRefresh = () => {
    const refreshBtn = container.querySelector('#refresh-stats-btn');

    if (!refreshBtn) {
      console.warn('Refresh stats button not found');
      return;
    }

    const handleRefresh = async () => {
      if (isRefreshing) return;

      const icon = refreshBtn.querySelector('i');
      if (icon) {
        isRefreshing = true;
        icon.classList.add('animate-spin');
        try {
          await loadStatsFn();
        } catch (error) {
          console.error('Error refreshing stats:', error);
        } finally {
          setTimeout(() => {
            icon.classList.remove('animate-spin');
            isRefreshing = false;
          }, 500);
        }
      }
    };

    refreshBtn.addEventListener('click', handleRefresh);
  };

  // Load initial stats
  loadStatsFn().catch(error => {
    console.error('Error loading initial stats:', error);
  });

  if (container.querySelector('#refresh-stats-btn')) {
    setupRefresh();
  } else {
    setTimeout(setupRefresh, 0);
  }
}
