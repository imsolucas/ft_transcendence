import { escapeHtml } from '../../utils/sanitize';

export type GameMode = '1v1' | 'tournament' | 'multiplayer' | 'multiplayer-tournament';

interface TutorialSlide {
  title: string;
  content: string;
}

interface TutorialContent {
  welcome: TutorialSlide;
  controls: TutorialSlide;
  gameplay: TutorialSlide;
}

const tutorialContent: Record<GameMode, TutorialContent> = {
  '1v1': {
    welcome: {
      title: '1v1 Local Match',
      content: 'Play against a friend on the same keyboard! First player to reach the target score wins.',
    },
    controls: {
      title: 'Controls',
      content: 'Use W and S keys OR ↑ and ↓ arrow keys to move your paddle up and down.\n\nShare the keyboard with your opponent!',
    },
    gameplay: {
      title: 'How to Play',
      content: '• Hit the ball with your paddle to keep it in play\n• Score by making the ball pass your opponent\'s paddle\n• First player to reach the target score wins\n• The ball speeds up as the game progresses',
    },
  },
  tournament: {
    welcome: {
      title: 'Tournament Mode',
      content: 'Compete in a tournament bracket! Players take turns, winners advance to the next round.',
    },
    controls: {
      title: 'Controls',
      content: 'Player 1: Use W and S keys to move your paddle up and down.\n\nPlayer 2: Use ↑ and ↓ arrow keys to move your paddle up and down.\n\nPlayers take turns playing matches.',
    },
    gameplay: {
      title: 'How to Play',
      content: '• Each match follows standard Pong rules\n• Winners advance to the next round\n• The tournament bracket shows who plays next\n• Last player standing wins the tournament!',
    },
  },
  multiplayer: {
    welcome: {
      title: 'Online Multiplayer',
      content: 'Play against players from around the world in real-time matches!',
    },
    controls: {
      title: 'Controls',
      content: 'Use W and S keys to move your paddle up and down. Your opponent controls their own paddle remotely.',
    },
    gameplay: {
      title: 'How to Play',
      content: '• Real-time gameplay via WebSocket connection\n• Score by making the ball pass your opponent\'s paddle\n• First player to reach the target score wins\n• Matches are recorded in your match history',
    },
  },
  'multiplayer-tournament': {
    welcome: {
      title: 'Online Tournament',
      content: 'Compete in an online tournament bracket! Multiple players join, winners advance to the next round until one champion remains.',
    },
    controls: {
      title: 'Controls',
      content: 'Use W and S keys to move your paddle up and down. Each player controls their own paddle remotely during their match.',
    },
    gameplay: {
      title: 'How to Play',
      content: '• Join a tournament lobby or create your own\n• Players are matched in tournament brackets\n• Winners advance to the next round automatically\n• The tournament bracket shows who plays next\n• Last player standing wins the tournament!\n• All matches are recorded in your match history',
    },
  },
  
};

export function showTutorialModal(
  gameMode: GameMode,
  onComplete: () => void
): void {
  const content = tutorialContent[gameMode];
  let currentSlide = 0;
  const slides = ['welcome', 'controls', 'gameplay'] as const;

  // Create modal overlay
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm';
  modal.id = 'tutorial-modal';

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'relative w-[850px] max-w-[90vw] max-h-[90vh] bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-sm rounded-[30px] shadow-[0_0_50px_rgba(255,20,147,0.4)] border-2 border-pink-400/30 p-8 md:p-12 font-poppins overflow-y-auto';

  // Retro grid overlay
  const gridOverlay = document.createElement('div');
  gridOverlay.className = 'absolute inset-0 opacity-10 pointer-events-none rounded-[30px]';
  gridOverlay.innerHTML = `
    <div class="grid-pattern" style="
      background-image:
        linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px);
      background-size: 20px 20px;
      width: 100%;
      height: 100%;
    "></div>
  `;
  modalContent.appendChild(gridOverlay);

  // Glowing orbs
  const orb1 = document.createElement('div');
  orb1.className = 'absolute top-4 right-4 w-8 h-8 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_20px_#00ffff]';
  modalContent.appendChild(orb1);

  const orb2 = document.createElement('div');
  orb2.className = 'absolute bottom-4 left-4 w-6 h-6 rounded-full bg-pink-400 animate-pulse shadow-[0_0_15px_#ff1493]';
  orb2.style.animationDelay = '500ms';
  modalContent.appendChild(orb2);

  // Content wrapper
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'relative z-10';

  // Title
  const title = document.createElement('h2');
  title.className = 'text-3xl md:text-4xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]';
  contentWrapper.appendChild(title);

  // Slide content
  const slideContent = document.createElement('div');
  slideContent.className = 'min-h-[200px] mb-6 text-white';
  slideContent.id = 'tutorial-slide-content';
  contentWrapper.appendChild(slideContent);

  // Navigation buttons
  const navContainer = document.createElement('div');
  navContainer.className = 'flex justify-between items-center gap-4 mb-6';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn px-6 py-3 rounded-lg border-2 border-cyan-400/50 cursor-pointer text-sm text-white font-bold hover:bg-cyan-400/20 hover:border-cyan-400 transition-all font-poppins uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed';
  prevBtn.textContent = '◄ PREV';
  prevBtn.disabled = true;

  const slideIndicator = document.createElement('div');
  slideIndicator.className = 'flex gap-2';
  slideIndicator.id = 'tutorial-slide-indicator';

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn px-6 py-3 rounded-lg border-2 border-pink-400 cursor-pointer text-sm text-white font-bold hover:bg-pink-400/20 hover:border-pink-400 transition-all font-poppins uppercase tracking-wider';
  nextBtn.textContent = 'NEXT ►';

  navContainer.appendChild(prevBtn);
  navContainer.appendChild(slideIndicator);
  navContainer.appendChild(nextBtn);
  contentWrapper.appendChild(navContainer);

  // Action buttons
  const actionContainer = document.createElement('div');
  actionContainer.className = 'flex flex-col gap-3';

  const skipCheckbox = document.createElement('label');
  skipCheckbox.className = 'flex items-center gap-2 text-pink-300 text-sm cursor-pointer';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'skip-tutorial-checkbox';
  skipCheckbox.appendChild(checkbox);
  skipCheckbox.appendChild(document.createTextNode('Don\'t show this tutorial again'));

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex gap-4 justify-center';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn w-48 h-12 rounded-lg border-2 border-pink-400 cursor-pointer text-base text-white font-bold hover:bg-pink-400/20 hover:shadow-[0_0_20px_rgba(255,20,147,0.5)] transition-all font-poppins bg-gradient-to-r from-pink-500/20 to-cyan-500/20 backdrop-blur-sm uppercase tracking-wider';
  closeBtn.textContent = 'START GAME';

  buttonContainer.appendChild(closeBtn);
  actionContainer.appendChild(skipCheckbox);
  actionContainer.appendChild(buttonContainer);
  contentWrapper.appendChild(actionContainer);

  modalContent.appendChild(contentWrapper);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Update slide function
  const updateSlide = () => {
    const slide = slides[currentSlide];
    const slideData = content[slide];

    title.textContent = slideData.title;
    slideContent.innerHTML = `<div class="text-center whitespace-pre-line text-lg leading-relaxed">${escapeHtml(slideData.content)}</div>`;

    // Update indicators
    slideIndicator.innerHTML = '';
    slides.forEach((_, index) => {
      const dot = document.createElement('div');
      dot.className = `w-3 h-3 rounded-full transition-all ${
        index === currentSlide
          ? 'bg-cyan-400 shadow-[0_0_10px_#00ffff]'
          : 'bg-gray-600'
      }`;
      slideIndicator.appendChild(dot);
    });

    // Update navigation buttons
    prevBtn.disabled = currentSlide === 0;
    nextBtn.textContent = currentSlide === slides.length - 1 ? 'START GAME ►' : 'NEXT ►';
  };

  // Navigation handlers
  prevBtn.addEventListener('click', () => {
    if (currentSlide > 0) {
      currentSlide--;
      updateSlide();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentSlide < slides.length - 1) {
      currentSlide++;
      updateSlide();
    } else {
      closeModal();
    }
  });

  closeBtn.addEventListener('click', closeModal);

  // Keyboard navigation
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
      currentSlide--;
      updateSlide();
    } else if (e.key === 'ArrowRight') {
      if (currentSlide < slides.length - 1) {
        currentSlide++;
        updateSlide();
      } else {
        closeModal();
      }
    }
  };

  document.addEventListener('keydown', handleKeyPress);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  function closeModal() {
    // Save skip preference
    if (checkbox.checked) {
      localStorage.setItem('skipTutorial', 'true');
    }

    // Remove event listener
    document.removeEventListener('keydown', handleKeyPress);

    // Remove modal
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
    }

    // Call completion callback
    onComplete();
  }

  // Initialize first slide
  updateSlide();
}

