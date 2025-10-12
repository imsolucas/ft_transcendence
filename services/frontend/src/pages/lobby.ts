export function MainPage(): HTMLElement {
  const container = document.createElement('div');
  container.className =
    'min-h-screen bg-gradient-to-b from-[#4B1B67] via-[#872481] via-[#DC25A3] via-[#F34C94] to-[#F3796A] pt-16';

  const content = document.createElement('div');
  content.className = 'relative mx-auto px-6 py-12 text-white font-poppins';

  content.innerHTML = `
    <section class="relative min-h-screen flex flex-col justify-center overflow-hidden">
      <!-- Neon Border -->
      <div class="absolute inset-0 border-8 border-pink-500/40 rounded-xl shadow-[0_0_30px_#F031A5_inset] pointer-events-none"></div>

      <!-- Title (Centered) -->
      <div class="text-center mb-12">
        <h1 class="text-6xl md:text-8xl font-extrabold tracking-wider drop-shadow-[0_0_10px_#F49752]">
          🕹️ PONG ARCADE
        </h1>
        <p class="text-lg md:text-xl text-gray-200 font-light mt-4">
          Step into the retro arena — challenge your friends or join a match!
        </p>
      </div>

      <!-- Button Menu (Left-Aligned) -->
      <div class="absolute left-12 top-1/2 -translate-y-1/2 flex flex-col gap-4 w-48">
        <button class="bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white px-6 py-3 rounded-lg text-lg font-bold text-left transition-all duration-300 hover:scale-105 shadow-[0_0_15px_#F031A5]">
          Local Game
        </button>
        <button class="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg text-lg font-semibold text-left border border-white/20 backdrop-blur-sm transition-all duration-300">
          Multiplayer
        </button>
      </div>

      <!-- Pong Table Preview (Right Side) -->
      <div class="flex justify-end mt-24 pr-12">
        <div class="relative w-full max-w-3xl h-72 bg-black border-4 border-white rounded-lg shadow-[0_0_30px_#fff_inset] overflow-hidden">
          <div class="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gray-500 opacity-60"></div>
          <div class="absolute left-6 top-1/2 w-3 h-16 bg-white rounded-sm animate-bounce"></div>
          <div class="absolute right-6 top-1/2 w-3 h-16 bg-white rounded-sm animate-bounce"></div>
          <div class="absolute w-4 h-4 bg-yellow-400 rounded-full animate-ping-slow"></div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="absolute bottom-8 left-12 text-sm text-gray-300 tracking-wider opacity-80">
        © 2025 Super Pong Arcade — Retro Vibes, Modern Play
      </footer>
    </section>
  `;

  // Custom Pong ball animation
  const pongBall = document.createElement('style');
  pongBall.textContent = `
    @keyframes ping-slow {
      0%, 100% { transform: translate(20%, 20%); }
      25% { transform: translate(80%, 10%); }
      50% { transform: translate(80%, 70%); }
      75% { transform: translate(10%, 80%); }
    }
    .animate-ping-slow {
      animation: ping-slow 3s linear infinite;
    }
  `;
  document.head.appendChild(pongBall);

  container.appendChild(content);
  return container;
}
