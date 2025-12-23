import { navigate } from '../router';
import { t } from '../i18n';
import { gradients, spacing } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { addFooterToPage } from '../components/layout/Footer';

export function PrivacyPolicyPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = `min-h-screen ${gradients.pageBackground} pt-16 pb-8 flex flex-col`;

  const wrapper = document.createElement('div');
  wrapper.className = 'relative min-h-screen flex items-center justify-center overflow-hidden py-8 flex-1';

  const content = document.createElement('div');
  content.className = `relative z-10 ${spacing.container} max-w-4xl`;

  // Back button
  const backButtonContainer = document.createElement('div');
  backButtonContainer.className = 'mb-6';
  const backButton = Button({
    text: String(t('common.back') || '← Back'),
    variant: 'outline',
    size: 'default',
    onClick: () => {
      window.history.back();
    },
  });
  backButtonContainer.appendChild(backButton);
  content.appendChild(backButtonContainer);

  // Main content card
  const card = document.createElement('div');
  card.className = 'bg-black/40 backdrop-blur-md rounded-2xl p-6 sm:p-8 border-2 border-white/40 shadow-lg';

  const title = document.createElement('h1');
  title.className = 'text-4xl md:text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]';
  title.textContent = String(t('legal.privacyPolicy') || 'Privacy Policy');
  card.appendChild(title);

  const lastUpdated = document.createElement('p');
  lastUpdated.className = 'text-white/60 text-sm mb-8';
  lastUpdated.textContent = String(t('legal.lastUpdated') || 'Last Updated: ') + new Date().toLocaleDateString();
  card.appendChild(lastUpdated);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'space-y-6 text-white/90 text-sm md:text-base leading-relaxed';

  contentDiv.innerHTML = `
    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-cyan-400 mb-4">${String(t('legal.introduction') || 'Introduction')}</h2>
      <p>${String(t('legal.privacyIntro') || 'Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform.')}</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-pink-400 mb-4">${String(t('legal.dataCollection') || 'Data Collection')}</h2>
      <p>${String(t('legal.dataCollectionText') || 'We collect information you provide directly, such as username, email address, and profile information. We also collect game statistics, match history, and usage data.')}</p>
      <ul class="list-disc list-inside space-y-2 ml-4">
        <li>${String(t('legal.dataCollectionItem1') || 'Account information (username, email, password)')}</li>
        <li>${String(t('legal.dataCollectionItem2') || 'Game statistics and match history')}</li>
        <li>${String(t('legal.dataCollectionItem3') || 'Profile information and preferences')}</li>
        <li>${String(t('legal.dataCollectionItem4') || 'Usage data and analytics')}</li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-cyan-400 mb-4">${String(t('legal.dataUsage') || 'How We Use Your Data')}</h2>
      <p>${String(t('legal.dataUsageText') || 'We use your data to provide and improve our services, personalize your experience, communicate with you, and ensure platform security.')}</p>
      <ul class="list-disc list-inside space-y-2 ml-4">
        <li>${String(t('legal.dataUsageItem1') || 'To provide and maintain our gaming platform')}</li>
        <li>${String(t('legal.dataUsageItem2') || 'To personalize your gaming experience')}</li>
        <li>${String(t('legal.dataUsageItem3') || 'To communicate with you about your account')}</li>
        <li>${String(t('legal.dataUsageItem4') || 'To ensure platform security and prevent fraud')}</li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-pink-400 mb-4">${String(t('legal.dataStorage') || 'Data Storage')}</h2>
      <p>${String(t('legal.dataStorageText') || 'Your data is stored securely on our servers. We implement appropriate security measures to protect your information.')}</p>
      <p>${String(t('legal.dataStorageDetails') || 'We use industry-standard encryption and security practices to protect your personal information from unauthorized access, disclosure, or destruction.')}</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-cyan-400 mb-4">${String(t('legal.userRights') || 'Your Rights')}</h2>
      <p>${String(t('legal.userRightsText') || 'You have the right to access, update, or delete your personal information. You can manage your account settings at any time.')}</p>
      <ul class="list-disc list-inside space-y-2 ml-4">
        <li>${String(t('legal.userRightsItem1') || 'Access your personal data')}</li>
        <li>${String(t('legal.userRightsItem2') || 'Update or correct your information')}</li>
        <li>${String(t('legal.userRightsItem3') || 'Delete your account and data')}</li>
        <li>${String(t('legal.userRightsItem4') || 'Export your data')}</li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-pink-400 mb-4">${String(t('legal.cookies') || 'Cookies')}</h2>
      <p>${String(t('legal.cookiesText') || 'We use cookies and similar technologies to enhance your experience, analyze usage, and support authentication.')}</p>
      <p>${String(t('legal.cookiesDetails') || 'You can control cookie settings through your browser preferences. However, disabling cookies may affect some platform functionality.')}</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-cyan-400 mb-4">${String(t('legal.contact') || 'Contact Us')}</h2>
      <p>${String(t('legal.contactText') || 'If you have questions about this Privacy Policy, please contact us through the platform.')}</p>
    </section>
  `;

  card.appendChild(contentDiv);
  content.appendChild(card);
  wrapper.appendChild(content);
  container.appendChild(wrapper);

  // Add footer
  addFooterToPage(container);

  return container;
}

