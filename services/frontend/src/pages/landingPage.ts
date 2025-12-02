import { navigate } from '../router';
import { t } from '../i18n';
import { gradients, spacing } from '../styles/theme';
import { createAnimatedBackground } from '../components/landing/AnimatedBackground';
import { createTitleSection } from '../components/landing/TitleSection';
import { createVideoSection, setupVideoControls } from '../components/landing/VideoSection';
import { createCTAButtons, setupCTAButtons } from '../components/landing/CTAButtons';

export function LandingPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = `min-h-screen ${gradients.pageBackground} pt-16`;

  container.innerHTML = `
    <section class="relative min-h-screen flex items-center justify-center overflow-hidden">
      ${createAnimatedBackground()}
      <div class="relative z-10 ${spacing.container} text-center">
        ${createTitleSection(t('landing.subtitle'))}
        ${createVideoSection({
          videoSrc: '/video/F1.mp4',
          posterSrc: '/images/f1intro.jpg',
          demoText: t('landing.demoVideo'),
          comingSoonText: t('landing.videoComingSoon'),
        })}
        ${createCTAButtons(t('landing.playNow'))}
      </div>
    </section>
  `;

  setupVideoControls(container);
  setupCTAButtons(container, () => navigate('lobby'));

  return container;
}
