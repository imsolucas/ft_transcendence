import { loadGoogleSignInService, handleCredentialResponse } from "../services/google";

export function AuthPage(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen flex justify-center items-center font-poppins';
  container.classList.add('bg-gradient-to-b', 'from-[#4B1B67]', 'via-[#872481]', 'via-[#DC25A3]', 'via-[#F34C94]', 'to-[#F3796A]');
  
  container.innerHTML = `
    <div class="container relative w-[850px] h-[550px] bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-sm m-5 rounded-[30px] shadow-[0_0_50px_rgba(255,20,147,0.4)] overflow-hidden max-w-[90vw] font-poppins border-2 border-pink-400/30">
      <!-- Retro grid overlay -->
      <div class="absolute inset-0 opacity-10 pointer-events-none">
        <div class="grid-pattern"></div>
      </div>
      
      <!-- Glowing orbs -->
      <div class="absolute top-4 right-4 w-8 h-8 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_20px_#00ffff]"></div>
      <div class="absolute bottom-4 left-4 w-6 h-6 rounded-full bg-pink-400 animate-pulse shadow-[0_0_15px_#ff1493] animation-delay-500"></div>
      
      <!-- Login Form -->
      <div class="form-box login absolute right-0 w-1/2 h-full bg-gradient-to-br from-gray-800/90 to-purple-900/90 backdrop-blur-md flex items-center text-white text-center p-10 z-10 transition-all duration-[600ms] ease-in-out delay-[1200ms] border-l border-pink-400/20">
        <form class="w-full">
          <h1 class="text-4xl -mt-2 mb-6 font-poppins font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">LOGIN</h1>
          
          <div class="input-box relative my-8">
            <input type="text" placeholder="USERNAME" required class="w-full py-3 px-5 pr-12 bg-gray-900/50 border-2 border-cyan-400/30 rounded-lg outline-none text-base text-white font-medium placeholder-gray-400 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all backdrop-blur-sm" />
            <i class="bx bxs-user absolute right-5 top-1/2 -translate-y-1/2 text-xl text-cyan-400"></i>
          </div>
          
          <div class="input-box relative my-8">
            <input type="password" placeholder="PASSWORD" required class="w-full py-3 px-5 pr-12 bg-gray-900/50 border-2 border-cyan-400/30 rounded-lg outline-none text-base text-white font-medium placeholder-gray-400 focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all backdrop-blur-sm" />
            <i class="bx bxs-lock-alt absolute right-5 top-1/2 -translate-y-1/2 text-xl text-cyan-400"></i>
          </div>
          
          <div class="forgot-link -mt-4 mb-6">
            <a href="#" class="text-sm text-pink-300 hover:text-pink-400 hover:drop-shadow-[0_0_5px_rgba(255,20,147,0.8)] transition-all font-poppins">FORGOT PASSWORD?</a>
          </div>
          
          <button type="submit" class="btn login-submit-btn w-full h-12 rounded-lg border-2 border-cyan-400 cursor-pointer text-base text-white font-bold hover:bg-cyan-400/20 hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all font-poppins bg-gradient-to-r from-cyan-500/20 to-pink-500/20 backdrop-blur-sm uppercase tracking-wider">
            ► LOGIN
          </button>
          
          <div class="retro-divider my-6 flex items-center">
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-pink-400/50 to-transparent"></div>
            <span class="px-4 text-xs text-pink-300 uppercase tracking-widest">OR</span>
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-pink-400/50 to-transparent"></div>
          </div>
          
          <div class="social-icons flex justify-center gap-3">
            <div id="google-signin-btn-login" class="google-signin-placeholder inline-flex p-3 border-2 border-pink-400/50 rounded-lg hover:border-pink-400 hover:shadow-[0_0_15px_rgba(255,20,147,0.3)] transition-all bg-gray-900/30 backdrop-blur-sm"></div>
          </div>
        </form>
      </div>

      <!-- Registration Form -->
      <div class="form-box register absolute right-0 w-1/2 h-full bg-gradient-to-br from-gray-800/90 to-purple-900/90 backdrop-blur-md flex items-center text-white text-center p-10 z-10 transition-all duration-[600ms] ease-in-out delay-[1200ms] invisible border-l border-pink-400/20">
        <form class="w-full">
          <h1 class="text-4xl -mt-2 mb-6 font-poppins font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 drop-shadow-[0_0_10px_rgba(255,20,147,0.5)]">REGISTER</h1>
          
          <div class="input-box relative my-6">
            <input type="text" placeholder="USERNAME" required class="w-full py-3 px-5 pr-12 bg-gray-900/50 border-2 border-pink-400/30 rounded-lg outline-none text-base text-white font-medium placeholder-gray-400 focus:border-pink-400 focus:shadow-[0_0_15px_rgba(255,20,147,0.3)] transition-all backdrop-blur-sm" />
            <i class="bx bxs-user absolute right-5 top-1/2 -translate-y-1/2 text-xl text-pink-400"></i>
          </div>
          
          <div class="input-box relative my-6">
            <input type="email" placeholder="EMAIL" required class="w-full py-3 px-5 pr-12 bg-gray-900/50 border-2 border-pink-400/30 rounded-lg outline-none text-base text-white font-medium placeholder-gray-400 focus:border-pink-400 focus:shadow-[0_0_15px_rgba(255,20,147,0.3)] transition-all backdrop-blur-sm" />
            <i class="bx bxs-envelope absolute right-5 top-1/2 -translate-y-1/2 text-xl text-pink-400"></i>
          </div>
          
          <div class="input-box relative my-6">
            <input type="password" placeholder="PASSWORD" required class="w-full py-3 px-5 pr-12 bg-gray-900/50 border-2 border-pink-400/30 rounded-lg outline-none text-base text-white font-medium placeholder-gray-400 focus:border-pink-400 focus:shadow-[0_0_15px_rgba(255,20,147,0.3)] transition-all backdrop-blur-sm" />
            <i class="bx bxs-lock-alt absolute right-5 top-1/2 -translate-y-1/2 text-xl text-pink-400"></i>
          </div>
          
          <button type="submit" class="btn register-submit-btn w-full h-12 rounded-lg border-2 border-pink-400 cursor-pointer text-base text-white font-bold hover:bg-pink-400/20 hover:shadow-[0_0_20px_rgba(255,20,147,0.5)] transition-all font-poppins bg-gradient-to-r from-pink-500/20 to-cyan-500/20 backdrop-blur-sm uppercase tracking-wider">
            ► REGISTER
          </button>
          
          <div class="retro-divider my-6 flex items-center">
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
            <span class="px-4 text-xs text-cyan-300 uppercase tracking-widest">OR</span>
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
          </div>
          
          <div class="social-icons flex justify-center gap-3">
            <div id="google-signin-btn-register" class="google-signin-placeholder inline-flex p-3 border-2 border-cyan-400/50 rounded-lg hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all bg-gray-900/30 backdrop-blur-sm"></div>
          </div>
        </form>
      </div>

      <!-- Toggle Box with animated background -->
      <div class="toggle-box absolute w-full h-full">
        <div class="toggle-bg absolute -left-[250%] w-[300%] h-full rounded-[150px] z-20 transition-all duration-[1800ms] ease-in-out bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 shadow-[0_0_50px_rgba(255,20,147,0.8)]"></div>
      </div>

      <!-- Toggle Panels -->
      <div class="toggle-panel toggle-left absolute left-0 w-1/2 h-full text-white flex flex-col justify-center items-center z-20 transition-all duration-[600ms] ease-in-out delay-[1200ms]">
        <div class="arcade-title mb-8">
          <h1 class="text-5xl font-bold font-poppins text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)] mb-2 animate-pulse">SUPER</h1>
          <h1 class="text-5xl font-bold font-poppins text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-white to-cyan-400 drop-shadow-[0_0_20px_rgba(255,20,147,0.8)] animate-pulse animation-delay-300">PONG</h1>
        </div>
        <p class="text-base mb-8 text-cyan-200 font-poppins uppercase tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">► NEW PLAYER?</p>
        <button class="btn register-btn w-48 h-12 bg-transparent border-2 border-cyan-400 rounded-lg cursor-pointer text-base text-white font-bold shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:bg-cyan-400/20 hover:shadow-[0_0_30px_rgba(0,255,255,0.6)] transition-all font-poppins uppercase tracking-wider">
          ► REGISTER
        </button>
      </div>

      <div class="toggle-panel toggle-right absolute -right-1/2 w-1/2 h-full text-white flex flex-col justify-center items-center z-20 transition-all duration-[600ms] ease-in-out delay-[600ms]">
        <div class="arcade-title mb-8">
          <h1 class="text-5xl font-bold font-poppins text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-white to-cyan-400 drop-shadow-[0_0_20px_rgba(255,20,147,0.8)] mb-2 animate-pulse">SUPER</h1>
          <h1 class="text-5xl font-bold font-poppins text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)] animate-pulse animation-delay-300">PONG</h1>
        </div>
        <p class="text-base mb-8 text-pink-200 font-poppins uppercase tracking-wider drop-shadow-[0_0_10px_rgba(255,20,147,0.5)]">► RETURNING PLAYER?</p>
        <button class="btn login-btn w-48 h-12 bg-transparent border-2 border-pink-400 rounded-lg cursor-pointer text-base text-white font-bold shadow-[0_0_20px_rgba(255,20,147,0.3)] hover:bg-pink-400/20 hover:shadow-[0_0_30px_rgba(255,20,147,0.6)] transition-all font-poppins uppercase tracking-wider">
          ► LOGIN
        </button>
      </div>
    </div>

    <!-- Enhanced Retro Arcade Styles -->
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
      
      /* Retro grid pattern */
      .grid-pattern {
        background-image: 
          linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px);
        background-size: 20px 20px;
        width: 100%;
        height: 100%;
      }
      
      /* Animation delays */
      .animation-delay-300 {
        animation-delay: 300ms;
      }
      
      .animation-delay-500 {
        animation-delay: 500ms;
      }
      
      /* Custom glow animations */
      @keyframes neon-glow {
        0%, 100% {
          text-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor;
        }
        50% {
          text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
        }
      }
      
      .arcade-title h1 {
        animation: neon-glow 2s ease-in-out infinite alternate;
      }
      
      /* Retro button effects */
      .btn {
        position: relative;
        overflow: hidden;
      }
      
      .btn:before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
      }
      
      .btn:hover:before {
        left: 100%;
      }
      
      /* Responsive design */
      @media screen and (max-width: 650px) {
        .container {
          height: calc(100vh - 40px);
          border-radius: 20px;
        }

        .form-box {
          bottom: 0;
          width: 100%;
          height: 70%;
          right: 0 !important;
          border-left: none;
          border-top: 1px solid rgba(255, 20, 147, 0.2);
        }

        .container.active .form-box {
          right: 0 !important;
          bottom: 30%;
        }

        .toggle-bg {
          left: 0 !important;
          top: -270%;
          width: 100%;
          height: 300%;
          border-radius: 20vw;
        }

        .container.active .toggle-bg {
          left: 0 !important;
          top: 70%;
        }

        .toggle-panel {
          width: 100%;
          height: 30%;
        }

        .toggle-panel.toggle-left {
          top: 0;
          left: 0 !important;
        }

        .container.active .toggle-panel.toggle-left {
          left: 0 !important;
          top: -30%;
        }

        .toggle-panel.toggle-right {
          right: 0 !important;
          bottom: -30%;
        }

        .container.active .toggle-panel.toggle-right {
          bottom: 0;
        }
        
        .arcade-title h1 {
          font-size: 2.5rem;
        }
      }

      @media screen and (max-width: 400px) {
        .form-box {
          padding: 20px;
        }

        .arcade-title h1 {
          font-size: 2rem;
        }
        
        .toggle-panel p {
          font-size: 0.875rem;
        }
        
        .toggle-panel button {
          width: 160px;
          height: 48px;
          font-size: 0.875rem;
        }
      }

      /* Active states */
      .container.active .form-box.login {
        right: 50%;
      }

      .container.active .form-box.register {
        visibility: visible;
        right: 50%;
      }

      .container.active .toggle-bg {
        left: 50%;
      }

      .container.active .toggle-panel.toggle-left {
        left: -50%;
        transition-delay: 600ms;
      }

      .container.active .toggle-panel.toggle-right {
        right: 0;
        transition-delay: 600ms;
      }

      /* Enhanced Google button styling */
      .google-signin-placeholder {
        min-width: 44px;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      
      .google-signin-placeholder:hover {
        transform: translateY(-1px);
      }

      /* Override Google button default styles */
      .google-signin-placeholder iframe {
        border-radius: 8px !important;
      }
      
      /* Scanline effect */
      .container:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 255, 255, 0.03) 2px,
          rgba(0, 255, 255, 0.03) 4px
        );
        pointer-events: none;
        z-index: 100;
      }
    </style>
  `;

  // Initialize Google Sign-In
  initializeGoogleSignIn(container);

  return container;
}

async function initializeGoogleSignIn(container: HTMLElement): Promise<void> {
  try {
    await loadGoogleSignInService();

    const google = (window as any).google;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
    
    if (!google?.accounts?.id) {
      console.warn('Google Identity SDK not available after load.');
      return;
    }
    
    if (!clientId) {
      console.log(clientId)
      console.warn('VITE_GOOGLE_CLIENT_ID is not set.');
      return;
    }

    // Initialize Google Sign-In
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    // Render Google Sign-In buttons for both forms
    const loginButton = container.querySelector('#google-signin-btn-login');
    const registerButton = container.querySelector('#google-signin-btn-register');

    if (loginButton) {
      google.accounts.id.renderButton(loginButton, {
        type: 'icon',
        size: 'large',
        theme: 'outline',
        shape: 'rectangular'
      });
    }

    if (registerButton) {
      google.accounts.id.renderButton(registerButton, {
        type: 'icon',
        size: 'large',
        theme: 'outline',
        shape: 'rectangular'
      });
    }

  } catch (err) {
    console.error('Failed to load/initialize Google Sign-In:', err);
    
    // Show fallback Google icons with retro styling if Google Sign-In fails
    const placeholders = container.querySelectorAll('.google-signin-placeholder');
    placeholders.forEach(placeholder => {
      placeholder.innerHTML = `
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-yellow-500 text-white font-bold text-lg shadow-[0_0_15px_rgba(255,0,0,0.3)]">
          G
        </div>
      `;
      placeholder.addEventListener('click', () => {
        console.warn('Google Sign-In not available');
      });
    });
  }
}