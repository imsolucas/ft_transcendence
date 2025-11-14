import { changeLanguage, getCurrentLanguage, t } from '../i18n';

export function LanguageSelector() {
  const container = document.createElement('div');
  container.className = 'relative';

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const currentLang = getCurrentLanguage();
  const currentLanguage = languages.find(lang => lang.code === currentLang) || languages[0];

  const render = () => {
    container.innerHTML = `
      <div class="relative">
        <button 
          id="language-selector-btn" 
          class="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors duration-200 border border-white/20"
          title="Change Language"
        >
          <span class="text-xl">${currentLanguage.flag}</span>
          <span class="text-sm text-white hidden sm:block">${currentLanguage.code.toUpperCase()}</span>
          <svg class="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        <div 
          id="language-dropdown" 
          class="absolute right-0 mt-2 bg-gray-900/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20 py-1 overflow-hidden min-w-[150px] hidden z-50"
        >
          ${languages.map(lang => `
            <button 
              class="language-option w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors flex items-center space-x-2 ${lang.code === currentLang ? 'bg-white/5' : ''}"
              data-lang="${lang.code}"
            >
              <span class="text-lg">${lang.flag}</span>
              <span>${lang.name}</span>
              ${lang.code === currentLang ? '<span class="ml-auto text-[#F34C94]">✓</span>' : ''}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const selectorBtn = container.querySelector('#language-selector-btn');
    const dropdown = container.querySelector('#language-dropdown') as HTMLElement;
    let isOpen = false;

    selectorBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen = !isOpen;
      if (isOpen) {
        dropdown.classList.remove('hidden');
        dropdown.style.maxHeight = '0';
        dropdown.style.opacity = '0';
        setTimeout(() => {
          dropdown.style.maxHeight = '200px';
          dropdown.style.opacity = '1';
        }, 10);
      } else {
        dropdown.style.maxHeight = '0';
        dropdown.style.opacity = '0';
        setTimeout(() => {
          dropdown.classList.add('hidden');
        }, 300);
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target as Node)) {
        if (isOpen) {
          isOpen = false;
          dropdown.style.maxHeight = '0';
          dropdown.style.opacity = '0';
          setTimeout(() => {
            dropdown.classList.add('hidden');
          }, 300);
        }
      }
    });

    // Handle language selection
    container.querySelectorAll('.language-option').forEach(option => {
      option.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const langCode = (e.currentTarget as HTMLElement).getAttribute('data-lang');
        if (langCode && langCode !== currentLang) {
          await changeLanguage(langCode);
          // Reload page to apply translations
          window.location.reload();
        }
        isOpen = false;
        dropdown.style.maxHeight = '0';
        dropdown.style.opacity = '0';
        setTimeout(() => {
          dropdown.classList.add('hidden');
        }, 300);
      });
    });

    // Add transition styles
    dropdown.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
  };

  render();

  return container;
}

