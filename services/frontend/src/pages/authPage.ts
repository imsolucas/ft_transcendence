import { loadGoogleSignInService, handleCredentialResponse } from "../services/google";
import { navigate } from "../router";
import { updateNavbar } from "../components/Navbar";
import type { Screen } from "../router";

// Import API functions from auth-script
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

interface BackendLoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    avatar: string;
  };
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    avatar?: string;
  };
}

// API Functions - using real backend
async function apiLogin(name: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      return {
        success: false,
        message: errorData.error || 'Invalid username or password',
      };
    }

    const data: BackendLoginResponse = await response.json();
    
    return {
      success: true,
      message: 'Login successful',
      token: data.token,
      user: {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        avatar: data.user.avatar,
      },
    };
  } catch (error) {
    console.error('Login API error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}

async function apiRegister(name: string, email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      return {
        success: false,
        message: errorData.error || 'Registration failed',
      };
    }

    // Signup returns 201, user needs to login to get token
    return {
      success: true,
      message: 'Registration successful! Please login with your credentials.',
    };
  } catch (error) {
    console.error('Registration API error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
    };
  }
}

// Utility function to show notifications
function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full max-w-sm`;
  
  // Set notification style based on type
  switch (type) {
    case 'success':
      notification.className += ' bg-green-500 text-white';
      break;
    case 'error':
      notification.className += ' bg-red-500 text-white';
      break;
    case 'info':
      notification.className += ' bg-blue-500 text-white';
      break;
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 100);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

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
      
      <!-- Welcome Screen (initially hidden) -->
      <div class="welcome-screen absolute inset-0 bg-gradient-to-br from-gray-900/98 to-purple-900/98 backdrop-blur-md flex flex-col justify-center items-center text-white z-50 opacity-0 invisible transition-all duration-1000 ease-in-out">
        <div class="welcome-content text-center transform scale-75 transition-all duration-1000 ease-out delay-500">
          <div class="arcade-title mb-12">
            <h1 class="text-7xl font-bold font-poppins text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-400 drop-shadow-[0_0_30px_rgba(0,255,255,1)] mb-4 animate-pulse">WELCOME</h1>
            <h2 class="text-5xl font-bold font-poppins text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-white to-cyan-400 drop-shadow-[0_0_30px_rgba(255,20,147,1)] animate-pulse animation-delay-300">TO SUPER PONG</h2>
          </div>
          
          <div class="loading-indicator mb-8">
            <div class="flex justify-center items-center space-x-2">
              <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_10px_#00ffff]"></div>
              <div class="w-3 h-3 bg-pink-400 rounded-full animate-bounce animation-delay-200 shadow-[0_0_10px_#ff1493]"></div>
              <div class="w-3 h-3 bg-cyan-400 rounded-full animate-bounce animation-delay-400 shadow-[0_0_10px_#00ffff]"></div>
            </div>
          </div>
          
          <p class="text-xl text-cyan-200 font-poppins uppercase tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] animate-pulse">INITIALIZING GAME...</p>
        </div>
      </div>

      <!-- Login Form -->
      <div class="form-box login absolute right-0 w-1/2 h-full bg-gradient-to-br from-gray-800/90 to-purple-900/90 backdrop-blur-md flex items-center text-white text-center p-10 z-10 transition-all duration-[600ms] ease-in-out delay-[1200ms] border-l border-pink-400/20">
        <form class="w-full" id="login-form">
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
          
          <!-- Error message display -->
          <div id="login-error" class="error-message hidden mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm font-poppins">
            <span class="error-text"></span>
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
        <form class="w-full" id="register-form">
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
          
          <!-- Error message display -->
          <div id="register-error" class="error-message hidden mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300 text-sm font-poppins">
            <span class="error-text"></span>
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
      .animation-delay-200 {
        animation-delay: 200ms;
      }
      
      .animation-delay-300 {
        animation-delay: 300ms;
      }
      
      .animation-delay-400 {
        animation-delay: 400ms;
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
      
      /* Zoom transition keyframes */
      @keyframes zoomToNavigation {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(10);
          opacity: 0;
        }
      }
      
      .container.navigating {
        animation: zoomToNavigation 1s ease-in forwards;
        animation-delay: 2s;
      }
      
      /* Welcome screen animations */
      .container.welcome .welcome-screen {
        opacity: 1;
        visibility: visible;
      }
      
      .container.welcome .welcome-content {
        transform: scale(1);
      }
      
      /* Hide forms during welcome */
      .container.welcome .form-box,
      .container.welcome .toggle-panel,
      .container.welcome .toggle-bg {
        opacity: 0;
        transition: opacity 500ms ease-out;
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
        
        .welcome-content .arcade-title h1:first-child {
          font-size: 3rem;
        }
        
        .welcome-content .arcade-title h2 {
          font-size: 2rem;
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
        
        .welcome-content .arcade-title h1:first-child {
          font-size: 2.5rem;
        }
        
        .welcome-content .arcade-title h2 {
          font-size: 1.5rem;
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
      
      /* Error message styling */
      .error-message {
        animation: slideIn 0.3s ease-out;
      }
      
      .error-message.hidden {
        display: none;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  `;

  // Initialize Google Sign-In and form handlers
  initializeAuthHandlers(container);

  return container;
}

// Enhanced authentication handler
async function initializeAuthHandlers(container: HTMLElement): Promise<void> {
  const containerEl = container.querySelector('.container');
  
  // Form toggle functionality
  const loginBtn = container.querySelector('.login-btn');
  const registerBtn = container.querySelector('.register-btn');
  
  loginBtn?.addEventListener('click', () => {
    containerEl?.classList.remove('active');
  });
  
  registerBtn?.addEventListener('click', () => {
    containerEl?.classList.add('active');
  });
  
  // Form submission handlers
  const loginForm = container.querySelector('#login-form');
  const registerForm = container.querySelector('#register-form');
  
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLoginSubmit(container);
  });
  
  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleRegisterSubmit(container);
  });

  // Initialize Google Sign-In
  try {
    await loadGoogleSignInService();

    const google = (window as any).google;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
    
    if (!google?.accounts?.id) {
      console.warn('Google Identity SDK not available after load.');
      return;
    }
    
    if (!clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not set.');
      return;
    }

    // Initialize Google Sign-In with custom callback
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        // Handle Google sign-in response
        handleCredentialResponse(response);
        // Trigger welcome screen
        handleSuccessfulAuth(container);
      },
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
    
    // Show fallback Google icons
    const placeholders = container.querySelectorAll('.google-signin-placeholder');
    placeholders.forEach(placeholder => {
      placeholder.innerHTML = `
        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-yellow-500 text-white font-bold text-lg shadow-[0_0_15px_rgba(255,0,0,0.3)]">
          G
        </div>
      `;
      placeholder.addEventListener('click', () => {
        console.warn('Google Sign-In not available - simulating success for demo');
        handleSuccessfulAuth(container);
      });
    });
  }
}

// Helper function to show error message
function showError(container: HTMLElement, formType: 'login' | 'register', message: string): void {
  const errorElement = container.querySelector(`#${formType}-error`) as HTMLElement;
  const errorText = errorElement?.querySelector('.error-text') as HTMLElement;
  
  if (errorElement && errorText) {
    errorText.textContent = message;
    errorElement.classList.remove('hidden');
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
      errorElement.classList.add('hidden');
    }, 5000);
  }
}

// Helper function to hide error message
function hideError(container: HTMLElement, formType: 'login' | 'register'): void {
  const errorElement = container.querySelector(`#${formType}-error`) as HTMLElement;
  if (errorElement) {
    errorElement.classList.add('hidden');
  }
}

// Handle login form submission
async function handleLoginSubmit(container: HTMLElement): Promise<void> {
  const usernameInput = container.querySelector('.form-box.login input[type="text"]') as HTMLInputElement;
  const passwordInput = container.querySelector('.form-box.login input[type="password"]') as HTMLInputElement;
  const loginBtn = container.querySelector('.login-submit-btn') as HTMLButtonElement;
  
  const name = usernameInput?.value.trim();
  const password = passwordInput?.value.trim();

  // Hide any previous errors
  hideError(container, 'login');

  if (!name || !password) {
    showError(container, 'login', 'Please fill in all fields');
    return;
  }

  // Show loading state
  const originalText = loginBtn.textContent;
  loginBtn.textContent = 'LOGGING IN...';
  loginBtn.disabled = true;

  try {
    const response = await apiLogin(name, password);
    
    if (response.success) {
      // Store auth token
      if (response.token && response.user) {
        localStorage.setItem('authToken', response.token);
        // Store user with both picture and avatar for compatibility
        const userToStore = {
          ...response.user,
          picture: response.user.avatar,
        };
        localStorage.setItem('user', JSON.stringify(userToStore));
      }
      
      showNotification('Login successful!', 'success');
      updateNavbar();
      handleSuccessfulAuth(container);
    } else {
      // Reset button state immediately on error
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
      showError(container, 'login', response.message || 'Invalid username or password');
      return;
    }
  } catch (error) {
    console.error('Login error:', error);
    // Reset button state immediately on error
    loginBtn.textContent = originalText;
    loginBtn.disabled = false;
    showError(container, 'login', 'Network error. Please try again.');
    return;
  }
  
  // Only reset button state here if login was successful
  loginBtn.textContent = originalText;
  loginBtn.disabled = false;
}

// Handle registration form submission
async function handleRegisterSubmit(container: HTMLElement): Promise<void> {
  const usernameInput = container.querySelector('.form-box.register input[type="text"]') as HTMLInputElement;
  const emailInput = container.querySelector('.form-box.register input[type="email"]') as HTMLInputElement;
  const passwordInput = container.querySelector('.form-box.register input[type="password"]') as HTMLInputElement;
  const registerBtn = container.querySelector('.register-submit-btn') as HTMLButtonElement;
  
  const name = usernameInput?.value.trim();
  const email = emailInput?.value.trim();
  const password = passwordInput?.value.trim();

  // Hide any previous errors
  hideError(container, 'register');

  if (!name || !email || !password) {
    showError(container, 'register', 'Please fill in all fields');
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showError(container, 'register', 'Please enter a valid email address');
    return;
  }

  if (password.length < 6) {
    showError(container, 'register', 'Password must be at least 6 characters long');
    return;
  }

  // Show loading state
  const originalText = registerBtn.textContent;
  registerBtn.textContent = 'REGISTERING...';
  registerBtn.disabled = true;

  try {
    const response = await apiRegister(name, email, password);
    
    if (response.success) {
      showNotification('Registration successful! Please login with your credentials.', 'success');
      
      // Clear form and switch to login
      usernameInput.value = '';
      emailInput.value = '';
      passwordInput.value = '';
      
      // Switch to login form after a delay
      setTimeout(() => {
        const containerEl = container.querySelector('.container');
        containerEl?.classList.remove('active');
        const loginForm = container.querySelector('.form-box.login') as HTMLElement;
        const registerForm = container.querySelector('.form-box.register') as HTMLElement;
        if (loginForm && registerForm) {
          registerForm.style.visibility = 'hidden';
          loginForm.style.visibility = 'visible';
        }
      }, 1500);
    } else {
      // Reset button state immediately on error
      registerBtn.textContent = originalText;
      registerBtn.disabled = false;
      showError(container, 'register', response.message || 'Registration failed');
      return;
    }
  } catch (error) {
    console.error('Registration error:', error);
    // Reset button state immediately on error
    registerBtn.textContent = originalText;
    registerBtn.disabled = false;
    showError(container, 'register', 'Network error. Please try again.');
    return;
  }
  
  // Only reset button state here if registration was successful
  registerBtn.textContent = originalText;
  registerBtn.disabled = false;
}

// Handle successful authentication
function handleSuccessfulAuth(container: HTMLElement): void {
  const containerEl = container.querySelector('.container');
  
  // Show welcome screen
  containerEl?.classList.add('welcome');
  
  // After 3 seconds, start zoom transition to navigation
  setTimeout(() => {
    containerEl?.classList.add('navigating');
    
    // After zoom animation completes, navigate to lobby
    setTimeout(() => {
      navigate('lobby' as Screen);
    }, 1500); // Wait for zoom animation to complete
  }, 3000); // Show welcome message for 3 seconds
}