export function MainPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gradient-to-b from-[#4B1B67] via-[#872481] via-[#DC25A3] via-[#F34C94] to-[#F3796A] pt-16';

  const content = document.createElement('div');
  content.className = 'max-w-4xl mx-auto px-4 py-12 text-center';
  
  content.innerHTML = `
    <div class="mb-12">
      <h1 class="text-5xl font-bold text-gray-800 mb-4 font-poppins">
        Welcome to Super Pong! 🏓
      </h1>
      <p class="text-xl text-white mb-8 font-poppins">
        Ready to play the most exciting pong game ever?
      </p>
    </div>
    
    <div class="grid md:grid-cols-3 gap-8 mb-12">
      <div class="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
        <div class="text-4xl mb-4">🎮</div>
        <h3 class="text-xl font-semibold text-gray-800 mb-2 font-poppins">Play Now</h3>
        <p class="text-gray-600 mb-4">Jump into a quick match and test your skills!</p>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          Start Game
        </button>
      </div>
      
      <div class="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
        <div class="text-4xl mb-4">🏆</div>
        <h3 class="text-xl font-semibold text-gray-800 mb-2 font-poppins">Leaderboard</h3>
        <p class="text-gray-600 mb-4">See how you rank against other players!</p>
        <button class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          View Rankings
        </button>
      </div>
      
      <div class="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
        <div class="text-4xl mb-4">📊</div>
        <h3 class="text-xl font-semibold text-gray-800 mb-2 font-poppins">Your Stats</h3>
        <p class="text-gray-600 mb-4">Track your progress and achievements!</p>
        <button class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          View Stats
        </button>
      </div>
    </div>
    
    <div class="bg-white p-8 rounded-2xl shadow-lg max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-800 mb-4 font-poppins">Game Features</h2>
      <div class="grid md:grid-cols-2 gap-4 text-left">
        <div class="flex items-center space-x-2">
          <span class="text-green-500">✓</span>
          <span class="text-gray-700">Real-time multiplayer</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-green-500">✓</span>
          <span class="text-gray-700">Customizable paddles</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-green-500">✓</span>
          <span class="text-gray-700">Power-ups & special effects</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-green-500">✓</span>
          <span class="text-gray-700">Global leaderboards</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-green-500">✓</span>
          <span class="text-gray-700">Achievement system</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-green-500">✓</span>
          <span class="text-gray-700">Cross-platform play</span>
        </div>
      </div>
    </div>
    
    <style>
      .font-poppins {
        font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      }
    </style>
  `;
  
  container.appendChild(content);
  return container;
}