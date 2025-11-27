import { gradients, typography, spacing } from '../../styles/theme';
import { escapeHtml } from '../../utils/sanitize';

export function createLobbyHeader(title: string, subtitle: string): string {
  return `
    <header class="text-center mt-16 ${spacing.section}">
      <h1 class="text-4xl md:text-6xl ${typography.weights.bold} mb-4 ${typography.fonts.primary}">
        <span class="${gradients.titleLeft}">${escapeHtml(title)}</span>
      </h1>
      <div class="${typography.sizes.heroSubtitle} ${typography.fonts.primary} text-gray-300">
        ${escapeHtml(subtitle)}
      </div>
    </header>
  `;
}
