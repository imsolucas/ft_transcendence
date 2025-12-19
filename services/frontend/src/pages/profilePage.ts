import { ProfileData } from '../components/profile/ProfileData';
import { gradients, spacing } from '../styles/theme';
import { getQueryParams } from '../router';
import { Button } from '../components/ui/Button';
import { navigate } from '../router';
import { t } from '../i18n';

export function ProfilePage(): HTMLElement {
  const container = document.createElement('div');
  container.className = `min-h-screen ${gradients.pageBackground} pt-16`;

  const wrapper = document.createElement('div');
  wrapper.className = 'relative min-h-screen flex items-center justify-center overflow-hidden py-8';

  const content = document.createElement('div');
  content.className = `relative z-10 ${spacing.container}`;

  // Check for username query parameter
  const queryParams = getQueryParams();
  const viewUsername = queryParams?.username;

  // Add back button if viewing another user's profile
  if (viewUsername) {
    const backButtonContainer = document.createElement('div');
    backButtonContainer.className = 'mb-4';
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
  }

  content.appendChild(ProfileData(viewUsername));
  wrapper.appendChild(content);
  container.appendChild(wrapper);

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .grid-pattern {
      background-image:
        linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px);
      background-size: 20px 20px;
      width: 100%;
      height: 100%;
    }
    .tab-btn {
      padding: 0.5rem 1rem;
      cursor: pointer;
      border: none;
      background: transparent;
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
      position: relative;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @media (min-width: 640px) {
      .tab-btn {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        letter-spacing: 1px;
      }
    }
    .tab-btn:after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 100%;
      height: 2px;
      background: transparent;
      transition: background 0.3s ease;
    }
    .tab-btn.active {
      color: #ff1493; /* Deep Pink */
    }
    .tab-btn.active:after {
      background: #ff1493;
      box-shadow: 0 0 10px #ff1493;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
      animation: fadeIn 0.5s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 768px) {
      .grid-cols-1.md\:grid-cols-3 {
        grid-template-columns: 1fr;
      }
      .md\:col-span-1,
      .md\:col-span-2 {
        grid-column: span 1 / span 1;
      }
      .p-8.md\:p-12 {
        padding: 1.5rem;
      }
      .text-3xl {
        font-size: 1.875rem;
      }
      .w-40 {
        width: 8rem;
      }
      .h-40 {
        height: 8rem;
      }
    }
  `;
  container.appendChild(style);

  return container;
}