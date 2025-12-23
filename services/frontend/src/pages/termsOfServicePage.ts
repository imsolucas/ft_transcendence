import { navigate } from '../router';
import { t } from '../i18n';
import { gradients, spacing } from '../styles/theme';
import { Button } from '../components/ui/Button';
import { addFooterToPage } from '../components/layout/Footer';

export function TermsOfServicePage(): HTMLElement {
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
  title.textContent = String(t('legal.termsOfService') || 'Terms of Service');
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
      <p>${String(t('legal.termsIntro') || 'By using our platform, you agree to these Terms of Service. Please read them carefully.')}</p>
      <p>${String(t('legal.termsIntroDetails') || 'These terms govern your use of our gaming platform and services. If you do not agree to these terms, please do not use our platform.')}</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-pink-400 mb-4">${String(t('legal.accountRules') || 'Account Rules')}</h2>
      <p>${String(t('legal.accountRulesText') || 'You are responsible for maintaining the security of your account. You must not share your credentials or use another user\'s account.')}</p>
      <ul class="list-disc list-inside space-y-2 ml-4">
        <li>${String(t('legal.accountRulesItem1') || 'You must provide accurate information when creating an account')}</li>
        <li>${String(t('legal.accountRulesItem2') || 'You are responsible for all activities under your account')}</li>
        <li>${String(t('legal.accountRulesItem3') || 'You must not share your account credentials')}</li>
        <li>${String(t('legal.accountRulesItem4') || 'You must notify us immediately of any security breach')}</li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-cyan-400 mb-4">${String(t('legal.userConduct') || 'User Conduct')}</h2>
      <p>${String(t('legal.userConductText') || 'You agree to use the platform respectfully. Harassment, cheating, or any form of abuse will result in account suspension or termination.')}</p>
      <ul class="list-disc list-inside space-y-2 ml-4">
        <li>${String(t('legal.userConductItem1') || 'Be respectful to other users')}</li>
        <li>${String(t('legal.userConductItem2') || 'Do not harass, threaten, or abuse others')}</li>
        <li>${String(t('legal.userConductItem3') || 'Do not use offensive language or content')}</li>
        <li>${String(t('legal.userConductItem4') || 'Follow all platform rules and guidelines')}</li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-pink-400 mb-4">${String(t('legal.gameRules') || 'Game Rules')}</h2>
      <p>${String(t('legal.gameRulesText') || 'Fair play is essential. Cheating, exploiting bugs, or using unauthorized software is strictly prohibited and will result in penalties.')}</p>
      <ul class="list-disc list-inside space-y-2 ml-4">
        <li>${String(t('legal.gameRulesItem1') || 'No cheating or use of unauthorized software')}</li>
        <li>${String(t('legal.gameRulesItem2') || 'No exploiting bugs or glitches')}</li>
        <li>${String(t('legal.gameRulesItem3') || 'No match-fixing or collusion')}</li>
        <li>${String(t('legal.gameRulesItem4') || 'Respect the spirit of fair competition')}</li>
      </ul>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-cyan-400 mb-4">${String(t('legal.intellectualProperty') || 'Intellectual Property')}</h2>
      <p>${String(t('legal.intellectualPropertyText') || 'All content, features, and functionality of the platform are owned by us and protected by copyright and other intellectual property laws.')}</p>
      <p>${String(t('legal.intellectualPropertyDetails') || 'You may not copy, modify, distribute, or create derivative works from our platform without explicit permission.')}</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-pink-400 mb-4">${String(t('legal.liability') || 'Liability')}</h2>
      <p>${String(t('legal.liabilityText') || 'We provide the platform "as is" without warranties. We are not liable for any damages arising from your use of the platform.')}</p>
      <p>${String(t('legal.liabilityDetails') || 'To the maximum extent permitted by law, we disclaim all warranties and are not liable for any indirect, incidental, or consequential damages.')}</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-cyan-400 mb-4">${String(t('legal.termination') || 'Termination')}</h2>
      <p>${String(t('legal.terminationText') || 'We reserve the right to suspend or terminate accounts that violate these terms. You may also delete your account at any time.')}</p>
      <p>${String(t('legal.terminationDetails') || 'Upon termination, your right to use the platform will immediately cease. We may delete your account and data in accordance with our Privacy Policy.')}</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-pink-400 mb-4">${String(t('legal.changes') || 'Changes to Terms')}</h2>
      <p>${String(t('legal.changesText') || 'We reserve the right to modify these terms at any time. We will notify users of significant changes. Continued use of the platform constitutes acceptance of modified terms.')}</p>
    </section>

    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-cyan-400 mb-4">${String(t('legal.contact') || 'Contact Us')}</h2>
      <p>${String(t('legal.contactText') || 'If you have questions about these Terms of Service, please contact us through the platform.')}</p>
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

