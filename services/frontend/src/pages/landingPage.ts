import { navigate } from '../router';

export function LandingPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gradient-to-b from-[#4B1B67] via-[#872481] via-[#DC25A3] via-[#F34C94] to-[#F3796A] pt-16';

  container.innerHTML = `
    <section class="relative min-h-screen flex items-center justify-center overflow-hidden">
      <!-- Animated Background Elements -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div class="absolute bottom-1/4 left-1/3 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <!-- Main Content -->
      <div class="relative z-10 max-w-6xl mx-auto px-4 text-center">
        <!-- Title -->
        <div class="mb-16">
          <h1 class="text-6xl md:text-8xl font-bold text-white mb-6 font-poppins">
            <span class="bg-gradient-to-r from-[#F49752] to-[#F031A5] bg-clip-text text-transparent">Super</span>
            <span class="bg-gradient-to-l from-[#F49752] to-[#F031A5] bg-clip-text text-transparent"> Pong</span>
          </h1>
          <p class="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto font-poppins">
            Experience the classic game reimagined with stunning visuals, power-ups, and multiplayer action
          </p>
        </div>

        <!-- Video Section -->
        <div class="mb-16 relative">
          <div class="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black/50 backdrop-blur-sm border border-white/10">
            <video class="w-full h-auto max-h-[500px] object-cover" controls loop="false" preload="auto" playsinline poster="/images/f1intro.jpg">
              <source src="/video/F1.mp4" type="video/mp4" />
            </video>

            <div class="hidden absolute inset-0 items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 video-fallback">
              <div class="text-center">
                <div class="text-6xl mb-4">🏓</div>
                <h3 class="text-2xl font-bold text-white mb-2">Demo Video</h3>
                <p class="text-gray-300">Video coming soon...</p>
              </div>
            </div>

            <button class="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors group play-button">
              <div class="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </button>
          </div>
        </div>

        <!-- CTA Buttons -->
        <div class="mb-16">
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button class="play-now-btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg font-poppins">
              Play Now
            </button>
          </div>
        </div>

        <!-- (Optional) Features -->
        <!--
        <div class="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <span class="text-2xl">⚡</span>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2 font-poppins">Lightning Fast</h3>
            <p class="text-black">60fps gameplay with ultra-responsive controls</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
              <span class="text-2xl">🌟</span>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2 font-poppins">Power-ups</h3>
            <p class="text-black">Collect power-ups to gain special abilities</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-500 to-red-600 rounded-2xl flex items-center justify-center">
              <span class="text-2xl">👥</span>
            </div>
            <h3 class="text-xl font-semibold text-white mb-2 font-poppins">Multiplayer</h3>
            <p class="text-black">Challenge players from around the world</p>
          </div>
        </div>
        -->
      </div>
    </section>
  `;

  // === Video and button interactivity ===
  const video = container.querySelector('video') as HTMLVideoElement;
  const playButton = container.querySelector('.play-button') as HTMLButtonElement;
  const videoFallback = container.querySelector('.video-fallback') as HTMLElement;

  if (video) {
    video.addEventListener('error', () => {
      videoFallback?.classList.remove('hidden');
      videoFallback?.classList.add('flex');
      playButton?.classList.add('hidden');
    });

    playButton?.addEventListener('click', () => {
      if (video.paused) {
        video.play();
        playButton.style.display = 'none';
      }
    });

    video.addEventListener('play', () => {
      playButton.style.display = 'none';
    });

    video.addEventListener('pause', () => {
      playButton.style.display = 'flex';
    });
  }

  // === CTA Buttons ===
  setTimeout(() => {
    const playNowBtn = container.querySelector('.play-now-btn');

    playNowBtn?.addEventListener('click', () => {
      navigate('lobby');
    });

  }, 0);

  return container;
}
