import { gradients, typography, spacing } from '../../styles/theme';
import { escapeHtml } from '../../utils/sanitize';

export function createTitleSection(subtitle: string): string {
  return `
    <div class="${spacing.section}">
      <h1 class="${typography.sizes.heroTitle} ${typography.weights.bold} text-white mb-6 ${typography.fonts.primary}">
        <span class="${gradients.titleLeft}">Super</span>
        <span class="${gradients.titleRight}"> Pong</span>
      </h1>
      <p class="${typography.sizes.heroSubtitle} text-gray-300 mb-8 ${spacing.containerExtraNarrow} ${typography.fonts.primary}">
        ${escapeHtml(subtitle)}
      </p>
    </div>
  `;
}
