import { colors, effects, spacing, typography } from '../../styles/theme';
import { escapeHtml } from '../../utils/sanitize';

interface VideoConfig {
  videoSrc: string;
  posterSrc: string;
  demoText: string;
  comingSoonText: string;
}

export function createVideoSection(config: VideoConfig): string {

  const demoText = escapeHtml(config.demoText);
  const comingSoonText = escapeHtml(config.comingSoonText);

  return `
    <div class="${spacing.section} relative">
      <div class="relative ${spacing.containerNarrow} ${effects.rounded['2xl']} overflow-hidden ${effects.shadow['2xl']} ${colors.background.blur} ${effects.blur.sm} border border-white/10">

        <div class="hidden absolute inset-0 items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 video-fallback">
          <div class="text-center">
            <div class="text-6xl mb-4">🏓</div>
            <h3 class="${typography.sizes.sectionTitle} ${typography.weights.bold} text-white mb-2">${demoText}</h3>
            <p class="text-gray-300">${comingSoonText}</p>
          </div>
        </div>

        <button class="absolute inset-0 flex items-center justify-center ${colors.background.overlay} ${colors.background.overlayHover} ${effects.transitions.default} group play-button">
          <div class="w-20 h-20 ${effects.rounded.full} bg-white/20 ${effects.blur.sm} flex items-center justify-center group-hover:bg-white/30 ${effects.transitions.default}">
            <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>
      </div>
    </div>
  `;
}

export function setupVideoControls(container: HTMLElement): void {
  const video = container.querySelector('video') as HTMLVideoElement;
  const playButton = container.querySelector('.play-button') as HTMLButtonElement;
  const videoFallback = container.querySelector('.video-fallback') as HTMLElement;

  if (!video) {
    console.warn('Video element not found in container');
    return;
  }

  // Handle video load errors
  const handleError = () => {
    if (videoFallback) {
      videoFallback.classList.remove('hidden');
      videoFallback.classList.add('flex');
    }
    if (playButton) {
      playButton.classList.add('hidden');
    }
  };

  video.addEventListener('error', handleError);

  // Handle play button click
  if (playButton) {
    playButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (video.paused) {
        try {
          await video.play();
          playButton.style.display = 'none';
        } catch (error) {
          console.error('Failed to play video:', error);
        }
      }
    });
  }

  // Hide play button when video plays
  video.addEventListener('play', () => {
    if (playButton) {
      playButton.style.display = 'none';
    }
  });

  // Show play button when video pauses (but not on end)
  video.addEventListener('pause', () => {
    if (playButton && !video.ended) {
      playButton.style.display = 'flex';
    }
  });

  // Handle video end
  video.addEventListener('ended', () => {
    if (playButton) {
      playButton.style.display = 'flex';
    }
  });
}
