import { navigate } from '../../router';
import { t } from '../../i18n';

export function createFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'relative z-10 bg-black/30 backdrop-blur-md border-t border-white/10 py-6 mt-auto';

  const container = document.createElement('div');
  container.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

  const content = document.createElement('div');
  content.className = 'flex flex-col sm:flex-row items-center justify-between gap-4';

  // Copyright
  const copyright = document.createElement('div');
  copyright.className = 'text-white/60 text-sm';
  copyright.textContent = `© ${new Date().getFullYear()} ${String(t('legal.appName') || 'Super Pong')}. ${String(t('legal.allRightsReserved') || 'All rights reserved.')}`;
  content.appendChild(copyright);

  // Links container
  const linksContainer = document.createElement('div');
  linksContainer.className = 'flex items-center gap-6';

  // Privacy Policy link
  const privacyLink = document.createElement('a');
  privacyLink.href = '#';
  privacyLink.className = 'text-white/80 hover:text-cyan-400 hover:underline transition-colors text-sm font-medium';
  privacyLink.textContent = String(t('legal.privacyPolicy') || 'Privacy Policy');
  privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('privacy-policy' as any);
  });

  // Terms of Service link
  const termsLink = document.createElement('a');
  termsLink.href = '#';
  termsLink.className = 'text-white/80 hover:text-pink-400 hover:underline transition-colors text-sm font-medium';
  termsLink.textContent = String(t('legal.termsOfService') || 'Terms of Service');
  termsLink.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('terms-of-service' as any);
  });

  // Separator
  const separator = document.createElement('span');
  separator.className = 'text-white/40';
  separator.textContent = '|';

  linksContainer.appendChild(privacyLink);
  linksContainer.appendChild(separator);
  linksContainer.appendChild(termsLink);
  content.appendChild(linksContainer);

  container.appendChild(content);
  footer.appendChild(container);

  return footer;
}

export function addFooterToPage(pageContainer: HTMLElement): void {
  const existingFooter = pageContainer.querySelector('footer');
  if (existingFooter) {
    return;
  }

  const footer = createFooter();
  pageContainer.appendChild(footer);
}

