import { navigate } from '../router';
import { t } from '../i18n';
import { gradients, spacing } from '../styles/theme';
import { createAnimatedBackground } from '../components/landing/AnimatedBackground';
import { createTitleSection } from '../components/landing/TitleSection';
import { createVideoSection, setupVideoControls } from '../components/landing/VideoSection';
import { createCTAButtons, setupCTAButtons } from '../components/landing/CTAButtons';
import { showPrivacyTermsModal } from '../components/legal/PrivacyTermsModal';
import { addFooterToPage } from '../components/layout/Footer';

export function LandingPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = `min-h-screen ${gradients.pageBackground} pt-16 flex flex-col`;

  container.innerHTML = `
    <section class="relative min-h-screen flex items-center justify-center overflow-hidden flex-1">
      ${createAnimatedBackground()}
      <div class="relative z-10 ${spacing.container} text-center">
        ${createTitleSection(t('landing.subtitle'))}
		<div class="flex items-center justify-center"/>
        ${createCTAButtons(t('landing.playNow'))}
      </div>
    </section>
  `;

  setupVideoControls(container);
  setupCTAButtons(container, () => navigate('lobby'));

  // Add footer
  addFooterToPage(container);

  // Show privacy/terms modal if not accepted
  setTimeout(() => {
    showPrivacyTermsModal();
  }, 100);

  return container;
}
