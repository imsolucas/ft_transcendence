import { typography } from '../../styles/theme';

export function createProfileTabs(): string {
  return `
    <div class="tabs">
      <div class="flex overflow-x-auto bg-black/40 backdrop-blur-md rounded-t-2xl border-2 border-b-0 border-white/40">
        <button
          class="tab-btn flex-1 min-w-[100px] py-3 sm:py-4 px-3 sm:px-6 ${typography.body} text-sm sm:text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider border-b-4 border-transparent"
          data-tab="profile-settings"
        >
          <i class="bx bx-cog mr-1 sm:mr-2"></i>
          <span class="hidden sm:inline">Settings</span>
          <span class="sm:hidden">Set</span>
        </button>
        <button
          class="tab-btn flex-1 min-w-[100px] py-3 sm:py-4 px-3 sm:px-6 ${typography.body} text-sm sm:text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider border-b-4 border-transparent"
          data-tab="friends"
        >
          <i class="bx bx-user mr-1 sm:mr-2"></i>
          <span class="hidden sm:inline">Friends</span>
          <span class="sm:hidden">Fri</span>
        </button>
        <button
          class="tab-btn flex-1 min-w-[100px] py-3 sm:py-4 px-3 sm:px-6 ${typography.body} text-sm sm:text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all uppercase tracking-wider border-b-4 border-transparent"
          data-tab="match-history"
        >
          <i class="bx bx-history mr-1 sm:mr-2"></i>
          <span class="hidden sm:inline">History</span>
          <span class="sm:hidden">His</span>
        </button>
      </div>
    </div>
  `;
}

export function setupProfileTabs(
  container: HTMLElement,
  defaultTab: string = 'profile-settings'
): void {
  setTimeout(() => {
    try {
      const tabButtons = container.querySelectorAll('.tab-btn');
      const tabContents = container.querySelectorAll('.tab-content');

      // Activate default tab
      const defaultButton = container.querySelector(`.tab-btn[data-tab="${defaultTab}"]`);
      const defaultContent = container.querySelector(`#${defaultTab}`);

      if (defaultButton) {
        defaultButton.classList.add('active', 'border-white', 'text-white');
      }
      if (defaultContent) {
        defaultContent.classList.add('active');
      }

      // Tab switching logic
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          const tabId = button.getAttribute('data-tab');

          // Remove active states
          tabButtons.forEach(btn => {
            btn.classList.remove('active', 'border-white', 'text-white');
          });

          // Add active state to clicked tab
          button.classList.add('active', 'border-white', 'text-white');

          // Show corresponding content
          tabContents.forEach(content => {
            if (content.id === tabId) {
              content.classList.add('active');
            } else {
              content.classList.remove('active');
            }
          });
        });
      });
    } catch (error) {
      console.error('Error setting up profile tabs:', error);
    }
  }, 0);
}
