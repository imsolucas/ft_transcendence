import { isAuthenticated } from '../utils/auth-script';
import { navigate } from '../router';

export function LandingPage(): HTMLElement {
  const container = document.createElement('div');
container.className = 'min-h-screen bg-gradient-to-b from-[#4B1B67] via-[#872481] via-[#DC25A3] via-[#F34C94] to-[#F3796A] pt-16';
  
  // Hero Section
  const heroSection = document.createElement('section');
  heroSection.className = 'relative min-h-screen flex items-center justify-center overflow-hidden';
  
  // Background animated elements
  const backgroundElements = document.createElement('div');
  backgroundElements.className = 'absolute inset-0 overflow-hidden pointer-events-none';
  backgroundElements.innerHTML = `
    <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
    <div class="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
    <div class="absolute bottom-1/4 left-1/3 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
  `;
  
  // Main content
  const mainContent = document.createElement('div');
  mainContent.className = 'relative z-10 max-w-6xl mx-auto px-4 text-center';
  
  // Title section
  const titleSection = document.createElement('div');
  titleSection.className = 'mb-16';
titleSection.innerHTML = `
	<h1 class="text-6xl md:text-8xl font-bold text-white mb-6 font-poppins">
		<span class="bg-gradient-to-r from-[#F49752] to-[#F031A5] bg-clip-text text-transparent">Super</span>
		<span class="bg-gradient-to-l from-[#F49752] to-[#F031A5] bg-clip-text text-transparent"> Pong</span>
	</h1>
	<p class="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto font-poppins">
		Experience the classic game reimagined with stunning visuals, power-ups, and multiplayer action
	</p>
`;
  
  // Video section
  const videoSection = document.createElement('div');
  videoSection.className = 'mb-16 relative';
  
  const videoContainer = document.createElement('div');
  videoContainer.className = 'relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black/50 backdrop-blur-sm border border-white/10';
  
  // Video element
  const video = document.createElement('video');
  video.className = 'w-full h-auto max-h-[500px] object-cover';
  video.controls = true;
  video.loop = false;
  video.preload = 'auto';
  video.playsInline = true;
  video.muted = false;
  video.poster = '/images/f1intro.jpg'; // Fallback poster image
  
// YouTube embed as the demo video
  const mp4Source = document.createElement('source');
  mp4Source.src = '/video/F1.mp4';
  mp4Source.type = 'video/mp4';
  
  video.appendChild(mp4Source);
  
  // Fallback for when video doesn't load
  const videoFallback = document.createElement('div');
  videoFallback.className = 'hidden absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900';
  videoFallback.innerHTML = `
    <div class="text-center">
      <div class="text-6xl mb-4">🏓</div>
      <h3 class="text-2xl font-bold text-white mb-2">Demo Video</h3>
      <p class="text-gray-300">Video coming soon...</p>
    </div>
  `;
  
  // Play button overlay (for better UX)
  const playButton = document.createElement('button');
  playButton.className = 'absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors group';
  playButton.innerHTML = `
    <div class="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
      <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
    </div>
  `;
  
  // Video error handling
  video.addEventListener('error', () => {
    videoFallback.classList.remove('hidden');
    playButton.classList.add('hidden');
  });
  
  // Play button functionality
  playButton.addEventListener('click', () => {
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
  
  videoContainer.appendChild(video);
  videoContainer.appendChild(videoFallback);
  videoContainer.appendChild(playButton);
  videoSection.appendChild(videoContainer);
  
  // CTA section
  const ctaSection = document.createElement('div');
  ctaSection.className = 'mb-16';
  ctaSection.innerHTML = `
    <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <button class="play-now-btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg font-poppins">
        Play Now
      </button>
      <button class="watch-trailer-btn bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 backdrop-blur-sm border border-white/20 font-poppins">
        Watch Trailer
      </button>
    </div>
  `;
  
  // Features section
  const featuresSection = document.createElement('div');
  featuresSection.className = 'grid md:grid-cols-3 gap-8 max-w-4xl mx-auto';
  featuresSection.innerHTML = `
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
  `;
  
  // Assemble the page
  mainContent.appendChild(titleSection);
  mainContent.appendChild(videoSection);
  mainContent.appendChild(ctaSection);
//   mainContent.appendChild(featuresSection);
  
  heroSection.appendChild(backgroundElements);
  heroSection.appendChild(mainContent);
  container.appendChild(heroSection);
  
  // Add event listeners for CTA buttons
  setTimeout(() => {
    const playNowBtn = container.querySelector('.play-now-btn');
    const watchTrailerBtn = container.querySelector('.watch-trailer-btn');
    
    playNowBtn?.addEventListener('click', () => {
      // Navigate to auth page if not logged in, or main if logged in
      if (isAuthenticated()) {
        navigate('main');
      } else {
        navigate('auth');
      }
    });
    
    watchTrailerBtn?.addEventListener('click', () => {
      // Focus on the video and play it
      video.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (video.paused) {
        video.play();
      }
    });
  }, 0);
  
  return container;
}