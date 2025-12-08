import { escapeHtml } from '../../utils/sanitize';
import { typography } from '../../styles/theme';
import { t } from '../../i18n';

export interface ProfileSettingsData {
  username: string;
  email: string;
  is2FAEnabled: boolean;
}

export interface ProfileSettingsHandlers {
  onFormSubmit: (data: { username?: string; email?: string }) => Promise<void>;
  on2FASetup: () => void;
}

export function createProfileSettings(data: ProfileSettingsData): string {
  const { username, email, is2FAEnabled } = data;

  const twoFAButtonText = is2FAEnabled
    ? String(t('profile.twoFAEnabled') || '2FA Has Been Enabled')
    : String(t('profile.setup2FA') || 'Setup 2FA');

  const twoFAButtonClasses = is2FAEnabled
    ? 'opacity-50 cursor-not-allowed bg-gray-800/30'
    : 'cursor-pointer hover:bg-white/10';

  return `
    <div id="profile-settings" class="tab-content bg-black/40 backdrop-blur-md rounded-b-2xl p-6 sm:p-8 border-2 border-white/40 border-t-0">
      <form id="profile-form" class="space-y-4 sm:space-y-6">
        <!-- Username -->
        <div class="form-group">
          <label class="block text-white/90 ${typography.body} text-sm sm:text-base font-semibold mb-2 uppercase tracking-wider">
            ${escapeHtml(String(t('profile.username') || 'Username'))}
          </label>
          <div class="flex gap-2 sm:gap-3">
            <input
              type="text"
              id="username"
              name="username"
              value="${escapeHtml(username)}"
              disabled
              class="flex-1 py-2 sm:py-3 px-3 sm:px-5 bg-black/60 border-2 border-white/30 rounded-lg text-white ${typography.body} text-sm sm:text-base outline-none focus:border-white/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              required
              minlength="3"
              maxlength="20"
            />
            <button
              type="button"
              id="edit-username-btn"
              class="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-800 hover:to-blue-800 border-2 border-white/50 rounded-lg text-white transition-all ${typography.body} text-sm sm:text-base font-semibold"
            >
              <i class="bx bx-edit"></i>
            </button>
          </div>
        </div>

        <!-- Email -->
        <div class="form-group">
          <label class="block text-white/90 ${typography.body} text-sm sm:text-base font-semibold mb-2 uppercase tracking-wider">
            ${escapeHtml(String(t('profile.email') || 'Email'))}
          </label>
          <div class="flex gap-2 sm:gap-3">
            <input
              type="email"
              id="email"
              name="email"
              value="${escapeHtml(email)}"
              disabled
              class="flex-1 py-2 sm:py-3 px-3 sm:px-5 bg-black/60 border-2 border-white/30 rounded-lg text-white ${typography.body} text-sm sm:text-base outline-none focus:border-white/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
            <button
              type="button"
              id="edit-email-btn"
              class="px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-800 hover:to-blue-800 border-2 border-white/50 rounded-lg text-white transition-all ${typography.body} text-sm sm:text-base font-semibold"
            >
              <i class="bx bx-edit"></i>
            </button>
          </div>
        </div>

        <!-- Language Selector -->
        <div class="form-group">
          <label class="block text-white/90 ${typography.body} text-sm sm:text-base font-semibold mb-2 uppercase tracking-wider">
            ${escapeHtml(String(t('profile.language') || 'Language'))}
          </label>
          <div id="language-selector-container"></div>
        </div>

        <!-- 2FA Button -->
        <div class="form-group">
          <button
            type="button"
            class="btn-2fa w-full py-3 sm:py-4 rounded-lg border-2 border-white/50 ${typography.body} text-sm sm:text-base text-white font-bold transition-all uppercase tracking-wider bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-800 hover:to-blue-800 backdrop-blur-sm ${twoFAButtonClasses}"
            ${is2FAEnabled ? 'disabled' : ''}
          >
            <i class="bx bx-lock-alt mr-2"></i>
            ${escapeHtml(twoFAButtonText)}
          </button>
        </div>

        <!-- Save Button -->
        <div class="form-group pt-2">
          <button
            type="submit"
            class="w-full py-3 sm:py-4 rounded-lg border-2 border-white/50 ${typography.body} text-sm sm:text-base text-white font-bold transition-all uppercase tracking-wider bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-800 hover:to-blue-800 backdrop-blur-sm"
          >
            ${escapeHtml(String(t('profile.saveChanges') || 'Save Changes'))}
          </button>
        </div>
      </form>
    </div>
  `;
}

export function setupProfileSettings(
  container: HTMLElement,
  handlers: ProfileSettingsHandlers
): void {
  setTimeout(() => {
    try {
      const profileForm = container.querySelector('#profile-form');
      const editUsernameBtn = container.querySelector('#edit-username-btn');
      const editEmailBtn = container.querySelector('#edit-email-btn');
      const usernameInput = container.querySelector('#username') as HTMLInputElement;
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const twoFABtn = container.querySelector('.btn-2fa') as HTMLButtonElement;

      // Edit button handlers
      if (editUsernameBtn && usernameInput) {
        editUsernameBtn.addEventListener('click', () => {
          usernameInput.disabled = !usernameInput.disabled;
          if (!usernameInput.disabled) {
            usernameInput.focus();
          }
        });
      }

      if (editEmailBtn && emailInput) {
        editEmailBtn.addEventListener('click', () => {
          emailInput.disabled = !emailInput.disabled;
          if (!emailInput.disabled) {
            emailInput.focus();
          }
        });
      }

      // 2FA button handler
      if (twoFABtn && !twoFABtn.disabled) {
        twoFABtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handlers.on2FASetup();
        });
      }

      // Form submission handler
      if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
          e.preventDefault();

          const updatedData: { username?: string; email?: string } = {};

          if (usernameInput && !usernameInput.disabled && usernameInput.value.trim()) {
            updatedData.username = usernameInput.value.trim();
          }
          if (emailInput && !emailInput.disabled && emailInput.value.trim()) {
            updatedData.email = emailInput.value.trim();
          }

          if (Object.keys(updatedData).length === 0) {
            return;
          }

          const submitBtn = profileForm.querySelector('button[type="submit"]') as HTMLButtonElement;
          const originalText = submitBtn?.textContent;

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = String(t('common.saving') || 'Saving...');
          }

          try {
            await handlers.onFormSubmit(updatedData);
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalText || String(t('profile.saveChanges'));
            }
          }
        });
      }
    } catch (error) {
      console.error('Error setting up profile settings:', error);
    }
  }, 0);
}
