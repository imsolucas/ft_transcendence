import { escapeHtml } from '../../utils/sanitize';
import { typography } from '../../styles/theme';
import { t } from '../../i18n';

export interface Match {
  opponent: string;
  result: 'win' | 'loss';
  score: string;
  date: string;
}

export function createMatchHistory(): string {
  return `
    <div id="match-history" class="tab-content bg-black/40 backdrop-blur-md rounded-b-2xl p-6 sm:p-8 border-2 border-white/40 border-t-0">
      <div class="space-y-3 sm:space-y-4">
        <!-- Match items will be inserted here -->
      </div>
    </div>
  `;
}

export function renderMatchHistory(container: HTMLElement, matches: Match[]): void {
  setTimeout(() => {
    try {
      const matchHistoryContainer = container.querySelector('#match-history > div');

      if (!matchHistoryContainer) {
        console.error('Match history container not found');
        return;
      }

      if (matches.length === 0) {
        matchHistoryContainer.innerHTML = `
          <div class="text-center py-8 sm:py-12">
            <i class="bx bx-ghost text-4xl sm:text-6xl text-white/50 mb-3 sm:mb-4"></i>
            <p class="text-white/70 ${typography.body} text-sm sm:text-base">
              ${escapeHtml(String(t('profile.noMatchHistory') || 'No match history yet'))}
            </p>
          </div>
        `;
        return;
      }

      const matchesHTML = matches.map(match => {
        const resultIcon = match.result === 'win' ? 'bx-trophy' : 'bx-x';
        const resultText = match.result === 'win'
          ? String(t('profile.win') || 'WIN')
          : String(t('profile.loss') || 'LOSS');

        return `
          <div class="bg-black/40 backdrop-blur-sm rounded-xl p-4 sm:p-6 border-2 border-white/40 transition-all">
            <div class="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
              <div class="flex items-center gap-2 sm:gap-3">
                <i class="bx ${resultIcon} text-2xl sm:text-3xl text-white"></i>
                <div>
                  <div class="${typography.body} text-base sm:text-lg font-semibold text-white">
                    ${escapeHtml(resultText)}
                  </div>
                  <div class="text-gray-400 ${typography.body} text-xs sm:text-sm">
                    vs ${escapeHtml(match.opponent)}
                  </div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-white ${typography.body} text-base sm:text-lg font-bold">
                  ${escapeHtml(match.score)}
                </div>
                <div class="text-gray-400 ${typography.body} text-xs sm:text-sm">
                  ${escapeHtml(match.date)}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      matchHistoryContainer.innerHTML = matchesHTML;
    } catch (error) {
      console.error('Error rendering match history:', error);
    }
  }, 0);
}
