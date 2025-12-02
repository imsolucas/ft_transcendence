import { typography } from '../../styles/theme';

export interface ProfileStatsData {
  wins: number;
  losses: number;
  winRate: number;
}

export function createProfileStats(data: ProfileStatsData): string {
  const { wins, losses, winRate } = data;

  return `
    <div class="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
      <!-- Wins -->
      <div class="bg-black/40 backdrop-blur-md rounded-2xl p-4 sm:p-6 border-2 border-white/40 transition-all">
        <div class="${typography.fonts.primary} text-2xl sm:text-4xl text-white ${typography.weights.bold}">
          ${wins}
        </div>
        <div class="text-white/90 ${typography.body} text-xs sm:text-sm uppercase tracking-wider mt-1 sm:mt-2 ${typography.weights.semibold}">
          Wins
        </div>
      </div>

      <!-- Losses -->
      <div class="bg-black/40 backdrop-blur-md rounded-2xl p-4 sm:p-6 border-2 border-white/40 transition-all">
        <div class="${typography.fonts.primary} text-2xl sm:text-4xl text-white ${typography.weights.bold}">
          ${losses}
        </div>
        <div class="text-white/90 ${typography.body} text-xs sm:text-sm uppercase tracking-wider mt-1 sm:mt-2 ${typography.weights.semibold}">
          Losses
        </div>
      </div>

      <!-- Win Rate -->
      <div class="bg-black/40 backdrop-blur-md rounded-2xl p-4 sm:p-6 border-2 border-white/40 transition-all">
        <div class="${typography.fonts.primary} text-2xl sm:text-4xl text-white ${typography.weights.bold}">
          ${winRate.toFixed(1)}%
        </div>
        <div class="text-white/90 ${typography.body} text-xs sm:text-sm uppercase tracking-wider mt-1 sm:mt-2 ${typography.weights.semibold}">
          Win Rate
        </div>
      </div>
    </div>
  `;
}
