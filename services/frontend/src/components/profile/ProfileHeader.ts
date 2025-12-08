import { escapeHtml } from '../../utils/sanitize';
import { typography } from '../../styles/theme';

export interface ProfileHeaderData {
  username: string;
  level: number;
  avatar: string;
}

export function createProfileHeader(data: ProfileHeaderData): string {
  const { username, level, avatar } = data;

  return `
    <div class="relative mb-6 sm:mb-8 text-center">
      <!-- Avatar Container -->
      <div class="relative inline-block mb-4 sm:mb-6">
        <div class="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto">
          <img
            id="profile-avatar"
            src="${escapeHtml(avatar)}"
            alt="${escapeHtml(username)}"
            class="w-full h-full object-cover rounded-full border-4 border-white/60"
          />
          <button
            id="camera-button"
            class="absolute bottom-0 right-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-800 hover:to-blue-800 rounded-full flex items-center justify-center border-2 border-white/50 transition-all cursor-pointer hover:scale-105"
          >
            <i class="bx bx-camera text-white text-lg sm:text-xl"></i>
          </button>
          <input type="file" id="photo-upload" accept="image/*" class="hidden" />
        </div>
      </div>

      <!-- Name and Level -->
      <h1 class="${typography.title} text-3xl sm:text-5xl mb-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${typography.weights.bold}">
        ${escapeHtml(username)}
      </h1>
      <div class="flex items-center justify-center gap-2">
        <span class="text-white/90 ${typography.body} text-sm sm:text-base ${typography.weights.semibold}">Level ${level}</span>
        <i class="bx bxs-star text-yellow-400 text-lg sm:text-xl"></i>
      </div>
    </div>
  `;
}

export function setupProfileHeader(
  container: HTMLElement,
  onPhotoUpload: (file: File) => Promise<void>
): void {
  setTimeout(() => {
    try {
      const cameraButton = container.querySelector('#camera-button');
      const photoUploadInput = container.querySelector('#photo-upload') as HTMLInputElement;

      if (cameraButton && photoUploadInput) {
        cameraButton.addEventListener('click', () => {
          photoUploadInput.click();
        });

        photoUploadInput.addEventListener('change', async () => {
          const file = photoUploadInput.files?.[0];
          if (file) {
            try {
              await onPhotoUpload(file);
            } catch (error) {
              console.error('Photo upload error:', error);
            } finally {
              photoUploadInput.value = '';
            }
          }
        });
      }
    } catch (error) {
      console.error('Error setting up profile header:', error);
    }
  }, 0);
}
