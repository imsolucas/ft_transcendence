import { t } from '../../i18n';
import { escapeHtml } from '../../utils/sanitize';
import { typography, effects } from '../../styles/theme';

export function createLocalGameHeader(): string {
	return `
		<header class="text-center mb-12">
			<h1 class="${typography.title} ${effects.textShadow.heavy} mb-4 text-white">
				${escapeHtml(t('localGame.title'))}
			</h1>
			<div class="${typography.subtitle} text-white ${effects.textShadow.medium}">
				${escapeHtml(t('localGame.subtitle'))}
			</div>
		</header>
	`;
}
