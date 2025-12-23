import { t } from '../../i18n';
import { navigate } from '../../router';

const ACCEPTANCE_KEY = 'privacyTermsAccepted';

export function hasAcceptedPrivacyTerms(): boolean {
  try {
    return localStorage.getItem(ACCEPTANCE_KEY) === 'true';
  } catch (error) {
    console.error('Error checking privacy terms acceptance:', error);
    return false;
  }
}

export function setPrivacyTermsAccepted(): void {
  try {
    localStorage.setItem(ACCEPTANCE_KEY, 'true');
  } catch (error) {
    console.error('Error storing privacy terms acceptance:', error);
  }
}

export function createPrivacyTermsModal(): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md';
  modal.id = 'privacy-terms-modal';

  const modalContent = document.createElement('div');
  modalContent.className = 'relative w-[900px] max-w-[95vw] h-[90vh] max-h-[90vh] bg-gradient-to-br from-gray-900/98 to-purple-900/98 backdrop-blur-sm rounded-[30px] shadow-[0_0_50px_rgba(255,20,147,0.4)] border-2 border-pink-400/30 flex flex-col font-poppins overflow-hidden';

  // Retro grid overlay
  const gridOverlay = document.createElement('div');
  gridOverlay.className = 'absolute inset-0 opacity-10 pointer-events-none';
  const gridPattern = document.createElement('div');
  gridPattern.className = 'grid-pattern';
  gridOverlay.appendChild(gridPattern);
  modalContent.appendChild(gridOverlay);

  // Glowing orbs
  const orb1 = document.createElement('div');
  orb1.className = 'absolute top-4 right-4 w-8 h-8 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_20px_#00ffff] z-20';
  modalContent.appendChild(orb1);

  const orb2 = document.createElement('div');
  orb2.className = 'absolute bottom-4 left-4 w-6 h-6 rounded-full bg-pink-400 animate-pulse shadow-[0_0_15px_#ff1493] z-20';
  modalContent.appendChild(orb2);

  // Content wrapper
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'relative z-10 flex flex-col h-full min-h-0';

  // Header
  const header = document.createElement('div');
  header.className = 'p-6 border-b border-pink-400/30';
  const title = document.createElement('h2');
  title.className = 'text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]';
  title.textContent = String(t('legal.modalTitle') || 'Privacy Policy & Terms of Service');
  header.appendChild(title);
  contentWrapper.appendChild(header);

  // Tab navigation
  const tabContainer = document.createElement('div');
  tabContainer.className = 'flex border-b border-pink-400/20';
  
  const privacyTab = document.createElement('button');
  privacyTab.className = 'flex-1 py-4 px-6 text-white/80 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider border-b-4 border-transparent tab-btn active';
  privacyTab.dataset.tab = 'privacy';
  privacyTab.textContent = String(t('legal.privacyPolicy') || 'Privacy Policy');
  
  const termsTab = document.createElement('button');
  termsTab.className = 'flex-1 py-4 px-6 text-white/80 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider border-b-4 border-transparent tab-btn';
  termsTab.dataset.tab = 'terms';
  termsTab.textContent = String(t('legal.termsOfService') || 'Terms of Service');

  tabContainer.appendChild(privacyTab);
  tabContainer.appendChild(termsTab);
  contentWrapper.appendChild(tabContainer);

  // Content area (scrollable)
  const contentArea = document.createElement('div');
  contentArea.className = 'flex-1 overflow-y-auto p-6 space-y-4 min-h-0';
  
  // Privacy Policy content
  const privacyContent = document.createElement('div');
  privacyContent.className = 'tab-content active text-white/90';
  privacyContent.id = 'privacy-content';
  privacyContent.innerHTML = `
    <div class="space-y-4 text-sm md:text-base leading-relaxed">
      <section class="space-y-4">
        <h3 class="text-xl font-bold text-cyan-400 mb-4">${String(t('legal.introduction') || 'Introduction')}</h3>
        <p>${String(t('legal.privacyIntro') || 'Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform.')}</p>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-pink-400 mt-6 mb-2">${String(t('legal.dataCollection') || 'Data Collection')}</h4>
        <p>${String(t('legal.dataCollectionText') || 'We collect information you provide directly, such as username, email address, and profile information. We also collect game statistics, match history, and usage data.')}</p>
        <ul class="list-disc list-inside space-y-2 ml-4">
          <li>${String(t('legal.dataCollectionItem1') || 'Account information (username, email, password)')}</li>
          <li>${String(t('legal.dataCollectionItem2') || 'Game statistics and match history')}</li>
          <li>${String(t('legal.dataCollectionItem3') || 'Profile information and preferences')}</li>
          <li>${String(t('legal.dataCollectionItem4') || 'Usage data and analytics')}</li>
        </ul>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-cyan-400 mt-6 mb-2">${String(t('legal.dataUsage') || 'How We Use Your Data')}</h4>
        <p>${String(t('legal.dataUsageText') || 'We use your data to provide and improve our services, personalize your experience, communicate with you, and ensure platform security.')}</p>
        <ul class="list-disc list-inside space-y-2 ml-4">
          <li>${String(t('legal.dataUsageItem1') || 'To provide and maintain our gaming platform')}</li>
          <li>${String(t('legal.dataUsageItem2') || 'To personalize your gaming experience')}</li>
          <li>${String(t('legal.dataUsageItem3') || 'To communicate with you about your account')}</li>
          <li>${String(t('legal.dataUsageItem4') || 'To ensure platform security and prevent fraud')}</li>
        </ul>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-pink-400 mt-6 mb-2">${String(t('legal.dataStorage') || 'Data Storage')}</h4>
        <p>${String(t('legal.dataStorageText') || 'Your data is stored securely on our servers. We implement appropriate security measures to protect your information.')}</p>
        <p>${String(t('legal.dataStorageDetails') || 'We use industry-standard encryption and security practices to protect your personal information from unauthorized access, disclosure, or destruction.')}</p>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-cyan-400 mt-6 mb-2">${String(t('legal.userRights') || 'Your Rights')}</h4>
        <p>${String(t('legal.userRightsText') || 'You have the right to access, update, or delete your personal information. You can manage your account settings at any time.')}</p>
        <ul class="list-disc list-inside space-y-2 ml-4">
          <li>${String(t('legal.userRightsItem1') || 'Access your personal data')}</li>
          <li>${String(t('legal.userRightsItem2') || 'Update or correct your information')}</li>
          <li>${String(t('legal.userRightsItem3') || 'Delete your account and data')}</li>
          <li>${String(t('legal.userRightsItem4') || 'Export your data')}</li>
        </ul>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-pink-400 mt-6 mb-2">${String(t('legal.cookies') || 'Cookies')}</h4>
        <p>${String(t('legal.cookiesText') || 'We use cookies and similar technologies to enhance your experience, analyze usage, and support authentication.')}</p>
        <p>${String(t('legal.cookiesDetails') || 'You can control cookie settings through your browser preferences. However, disabling cookies may affect some platform functionality.')}</p>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-cyan-400 mt-6 mb-2">${String(t('legal.contact') || 'Contact Us')}</h4>
        <p>${String(t('legal.contactText') || 'If you have questions about this Privacy Policy, please contact us through the platform.')}</p>
      </section>
    </div>
  `;

  // Terms of Service content
  const termsContent = document.createElement('div');
  termsContent.className = 'tab-content hidden text-white/90';
  termsContent.id = 'terms-content';
  termsContent.innerHTML = `
    <div class="space-y-4 text-sm md:text-base leading-relaxed">
      <section class="space-y-4">
        <h3 class="text-xl font-bold text-cyan-400 mb-4">${String(t('legal.introduction') || 'Introduction')}</h3>
        <p>${String(t('legal.termsIntro') || 'By using our platform, you agree to these Terms of Service. Please read them carefully.')}</p>
        <p>${String(t('legal.termsIntroDetails') || 'These terms govern your use of our gaming platform and services. If you do not agree to these terms, please do not use our platform.')}</p>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-pink-400 mt-6 mb-2">${String(t('legal.accountRules') || 'Account Rules')}</h4>
        <p>${String(t('legal.accountRulesText') || 'You are responsible for maintaining the security of your account. You must not share your credentials or use another user\'s account.')}</p>
        <ul class="list-disc list-inside space-y-2 ml-4">
          <li>${String(t('legal.accountRulesItem1') || 'You must provide accurate information when creating an account')}</li>
          <li>${String(t('legal.accountRulesItem2') || 'You are responsible for all activities under your account')}</li>
          <li>${String(t('legal.accountRulesItem3') || 'You must not share your account credentials')}</li>
          <li>${String(t('legal.accountRulesItem4') || 'You must notify us immediately of any security breach')}</li>
        </ul>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-cyan-400 mt-6 mb-2">${String(t('legal.userConduct') || 'User Conduct')}</h4>
        <p>${String(t('legal.userConductText') || 'You agree to use the platform respectfully. Harassment, cheating, or any form of abuse will result in account suspension or termination.')}</p>
        <ul class="list-disc list-inside space-y-2 ml-4">
          <li>${String(t('legal.userConductItem1') || 'Be respectful to other users')}</li>
          <li>${String(t('legal.userConductItem2') || 'Do not harass, threaten, or abuse others')}</li>
          <li>${String(t('legal.userConductItem3') || 'Do not use offensive language or content')}</li>
          <li>${String(t('legal.userConductItem4') || 'Follow all platform rules and guidelines')}</li>
        </ul>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-pink-400 mt-6 mb-2">${String(t('legal.gameRules') || 'Game Rules')}</h4>
        <p>${String(t('legal.gameRulesText') || 'Fair play is essential. Cheating, exploiting bugs, or using unauthorized software is strictly prohibited and will result in penalties.')}</p>
        <ul class="list-disc list-inside space-y-2 ml-4">
          <li>${String(t('legal.gameRulesItem1') || 'No cheating or use of unauthorized software')}</li>
          <li>${String(t('legal.gameRulesItem2') || 'No exploiting bugs or glitches')}</li>
          <li>${String(t('legal.gameRulesItem3') || 'No match-fixing or collusion')}</li>
          <li>${String(t('legal.gameRulesItem4') || 'Respect the spirit of fair competition')}</li>
        </ul>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-cyan-400 mt-6 mb-2">${String(t('legal.intellectualProperty') || 'Intellectual Property')}</h4>
        <p>${String(t('legal.intellectualPropertyText') || 'All content, features, and functionality of the platform are owned by us and protected by copyright and other intellectual property laws.')}</p>
        <p>${String(t('legal.intellectualPropertyDetails') || 'You may not copy, modify, distribute, or create derivative works from our platform without explicit permission.')}</p>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-pink-400 mt-6 mb-2">${String(t('legal.liability') || 'Liability')}</h4>
        <p>${String(t('legal.liabilityText') || 'We provide the platform "as is" without warranties. We are not liable for any damages arising from your use of the platform.')}</p>
        <p>${String(t('legal.liabilityDetails') || 'To the maximum extent permitted by law, we disclaim all warranties and are not liable for any indirect, incidental, or consequential damages.')}</p>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-cyan-400 mt-6 mb-2">${String(t('legal.termination') || 'Termination')}</h4>
        <p>${String(t('legal.terminationText') || 'We reserve the right to suspend or terminate accounts that violate these terms. You may also delete your account at any time.')}</p>
        <p>${String(t('legal.terminationDetails') || 'Upon termination, your right to use the platform will immediately cease. We may delete your account and data in accordance with our Privacy Policy.')}</p>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-pink-400 mt-6 mb-2">${String(t('legal.changes') || 'Changes to Terms')}</h4>
        <p>${String(t('legal.changesText') || 'We reserve the right to modify these terms at any time. We will notify users of significant changes. Continued use of the platform constitutes acceptance of modified terms.')}</p>
      </section>

      <section class="space-y-4">
        <h4 class="text-lg font-semibold text-cyan-400 mt-6 mb-2">${String(t('legal.contact') || 'Contact Us')}</h4>
        <p>${String(t('legal.contactText') || 'If you have questions about these Terms of Service, please contact us through the platform.')}</p>
      </section>
    </div>
  `;

  contentArea.appendChild(privacyContent);
  contentArea.appendChild(termsContent);
  contentWrapper.appendChild(contentArea);

  // Footer with links and accept button
  const footer = document.createElement('div');
  footer.className = 'p-6 border-t border-pink-400/30 bg-black/20 flex-shrink-0';
  
  const linksContainer = document.createElement('div');
  linksContainer.className = 'flex justify-center gap-4 mb-4 text-sm';
  
  const privacyLink = document.createElement('a');
  privacyLink.href = '#';
  privacyLink.className = 'text-cyan-400 hover:text-cyan-300 hover:underline transition-colors';
  privacyLink.textContent = String(t('legal.viewFullPrivacyPolicy') || 'View Full Privacy Policy');
  privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('privacy-policy' as any);
    modal.remove();
  });
  
  const termsLink = document.createElement('a');
  termsLink.href = '#';
  termsLink.className = 'text-pink-400 hover:text-pink-300 hover:underline transition-colors';
  termsLink.textContent = String(t('legal.viewFullTerms') || 'View Full Terms of Service');
  termsLink.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('terms-of-service' as any);
    modal.remove();
  });
  
  linksContainer.appendChild(privacyLink);
  linksContainer.appendChild(termsLink);
  footer.appendChild(linksContainer);

  // Accept button
  const acceptButton = document.createElement('button');
  acceptButton.className = 'w-full py-4 rounded-lg border-2 border-cyan-400 cursor-pointer text-lg text-white font-bold hover:bg-cyan-400/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all uppercase tracking-wider bg-gradient-to-r from-cyan-500/20 to-pink-500/20 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed';
  acceptButton.id = 'accept-privacy-terms-btn';
  acceptButton.textContent = String(t('legal.accept') || 'ACCEPT');
  acceptButton.disabled = true;
  
  // Track which tabs have been viewed
  let privacyViewed = false;
  let termsViewed = false;
  
  const updateAcceptButton = () => {
    if (privacyViewed && termsViewed) {
      acceptButton.disabled = false;
      acceptButton.classList.remove('disabled:opacity-50', 'disabled:cursor-not-allowed');
    }
  };

  // Tab switching logic
  privacyTab.addEventListener('click', () => {
    privacyTab.classList.add('active', 'border-cyan-400', 'text-white');
    privacyTab.classList.remove('border-transparent', 'text-white/80');
    termsTab.classList.remove('active', 'border-cyan-400', 'text-white');
    termsTab.classList.add('border-transparent', 'text-white/80');
    
    privacyContent.classList.remove('hidden');
    privacyContent.classList.add('active');
    termsContent.classList.add('hidden');
    termsContent.classList.remove('active');
    
    privacyViewed = true;
    updateAcceptButton();
  });

  termsTab.addEventListener('click', () => {
    termsTab.classList.add('active', 'border-cyan-400', 'text-white');
    termsTab.classList.remove('border-transparent', 'text-white/80');
    privacyTab.classList.remove('active', 'border-cyan-400', 'text-white');
    privacyTab.classList.add('border-transparent', 'text-white/80');
    
    termsContent.classList.remove('hidden');
    termsContent.classList.add('active');
    privacyContent.classList.add('hidden');
    privacyContent.classList.remove('active');
    
    termsViewed = true;
    updateAcceptButton();
  });

  // Mark privacy as viewed initially (it's the default tab)
  privacyViewed = true;
  updateAcceptButton();

  // Accept button handler
  acceptButton.addEventListener('click', () => {
    if (!acceptButton.disabled) {
      setPrivacyTermsAccepted();
      modal.remove();
    }
  });

  footer.appendChild(acceptButton);
  contentWrapper.appendChild(footer);
  modalContent.appendChild(contentWrapper);
  modal.appendChild(modalContent);

  // Add styles
  const styleId = 'privacy-terms-modal-styles';
  let style = document.getElementById(styleId) as HTMLStyleElement;
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .grid-pattern {
        background-image:
          linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px);
        background-size: 20px 20px;
        width: 100%;
        height: 100%;
      }
      .tab-content {
        display: none;
      }
      .tab-content.active {
        display: block;
        animation: fadeIn 0.3s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      #privacy-terms-modal .tab-btn.active {
        border-bottom-color: #00ffff;
        color: white;
      }
      #privacy-terms-modal .tab-content {
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 255, 255, 0.5) transparent;
      }
      #privacy-terms-modal .tab-content::-webkit-scrollbar {
        width: 8px;
      }
      #privacy-terms-modal .tab-content::-webkit-scrollbar-track {
        background: transparent;
      }
      #privacy-terms-modal .tab-content::-webkit-scrollbar-thumb {
        background-color: rgba(0, 255, 255, 0.5);
        border-radius: 4px;
      }
      #privacy-terms-modal .tab-content::-webkit-scrollbar-thumb:hover {
        background-color: rgba(0, 255, 255, 0.7);
      }
    `;
    document.head.appendChild(style);
  }

  return modal;
}

export function showPrivacyTermsModal(): void {
  if (hasAcceptedPrivacyTerms()) {
    return;
  }

  const existingModal = document.getElementById('privacy-terms-modal');
  if (existingModal) {
    return;
  }

  const modal = createPrivacyTermsModal();
  document.body.appendChild(modal);
}

