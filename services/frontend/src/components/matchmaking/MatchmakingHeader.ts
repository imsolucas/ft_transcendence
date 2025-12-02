import { typography } from '../../styles/theme';
import { escapeHtml } from '../../utils/sanitize';

export function createMatchmakingHeader(
	title: string,
	subtitle: string,
	status: 'searching' | 'found' | 'error'
): string {
	const subtitleColor = status === 'error'
		? 'text-red-400'
		: status === 'found'
		? 'text-green-400'
		: 'text-gray-300';

	return `
		<header class="text-center mb-8">
			<h1 class="text-4xl md:text-6xl ${typography.weights.bold} mb-4 ${typography.fonts.primary} text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
				${escapeHtml(title)}
			</h1>
			<div class="${typography.sizes.heroSubtitle} ${typography.fonts.primary} ${subtitleColor}">
				${escapeHtml(subtitle)}
			</div>
		</header>
	`;
}
