import { navigate } from '../router';
import type { Screen } from '../router';
import { updateNavbar } from '../components/Navbar';

// Types for API requests/responses
interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    picture?: string;
  };
}

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export function initializeAuthPage(): void {
  const container = document.querySelector('.container') as HTMLElement;
  const registerBtn = document.querySelector('.register-btn') as HTMLButtonElement;
  const loginBtn = document.querySelector('.login-btn') as HTMLButtonElement;
  
  if (!container || !registerBtn || !loginBtn) {
    console.warn('Landing page elements not found');
    return;
  }

  // Ensure icons are loaded
  ensureIconsLoaded();

  registerBtn.addEventListener('click', () => {
    console.log('Register button clicked - switching to register');
    switchToRegister(container);
  });

  // Toggle to login form  
  loginBtn.addEventListener('click', () => {
    console.log('Login button clicked - switching to login');
    switchToLogin(container);
  });

  // Handle form submissions
  const loginForm = document.querySelector('.form-box.login form') as HTMLFormElement;
  const registerForm = document.querySelector('.form-box.register form') as HTMLFormElement;

  if (loginForm) {
    loginForm.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      handleLogin();
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      handleRegistration();
    });
  }

  // Handle social login clicks
  const socialLinks = document.querySelectorAll('.social-icons a');
  socialLinks.forEach(link => {
    link.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const platform = link.querySelector('i')?.className.split('-')[1] || 'unknown';
      handleSocialLogin(platform);
    });
  });
}

function switchToRegister(container: HTMLElement): void {
  const loginForm = document.querySelector('.form-box.login') as HTMLElement;
  const registerForm = document.querySelector('.form-box.register') as HTMLElement;
  
  if (!loginForm || !registerForm) return;
  
  container.classList.add('active');
  
  // Switch forms halfway through the animation
  setTimeout(() => {
    loginForm.style.visibility = 'hidden';
    registerForm.style.visibility = 'visible';
  }, 300);
}

function switchToLogin(container: HTMLElement): void {
  const loginForm = document.querySelector('.form-box.login') as HTMLElement;
  const registerForm = document.querySelector('.form-box.register') as HTMLElement;
  
  if (!loginForm || !registerForm) return;
  
  container.classList.remove('active');
  
  // Switch forms halfway through the animation
  setTimeout(() => {
    registerForm.style.visibility = 'hidden';
    loginForm.style.visibility = 'visible';
  }, 300);
}

async function handleLogin(): Promise<void> {
  const usernameInput = document.querySelector('.form-box.login input[type="text"]') as HTMLInputElement;
  const passwordInput = document.querySelector('.form-box.login input[type="password"]') as HTMLInputElement;
  const loginBtn = document.querySelector('.login-submit-btn') as HTMLButtonElement;
  
  const username = usernameInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!username || !password) {
    showNotification('Please fill in all fields', 'error');
    return;
  }

  // Show loading state
  const originalText = loginBtn.textContent;
  loginBtn.textContent = 'Logging in...';
  loginBtn.disabled = true;

  try {
    const response = await apiLogin({ username, password });
    
    if (response.success) {
      // Store auth token
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      showNotification('Login successful!', 'success');
      
      // Update navbar to show logged-in state
      updateNavbar();
      
      // Navigate to main page after successful login
      setTimeout(() => {
        navigate('main' as Screen);
      }, 1500);
    } else {
      showNotification(response.message || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification('Network error. Please try again.', 'error');
  } finally {
    // Reset button state
    loginBtn.textContent = originalText;
    loginBtn.disabled = false;
  }
}

async function handleRegistration(): Promise<void> {
  const usernameInput = document.querySelector('.form-box.register input[type="text"]') as HTMLInputElement;
  const emailInput = document.querySelector('.form-box.register input[type="email"]') as HTMLInputElement;
  const passwordInput = document.querySelector('.form-box.register input[type="password"]') as HTMLInputElement;
  const registerBtn = document.querySelector('.register-submit-btn') as HTMLButtonElement;
  
  const username = usernameInput?.value.trim();
  const email = emailInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!username || !email || !password) {
    showNotification('Please fill in all fields', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showNotification('Please enter a valid email address', 'error');
    return;
  }

  if (password.length < 6) {
    showNotification('Password must be at least 6 characters long', 'error');
    return;
  }

  // Show loading state
  const originalText = registerBtn.textContent;
  registerBtn.textContent = 'Registering...';
  registerBtn.disabled = true;

  try {
    const response = await apiRegister({ username, email, password });
    
    if (response.success) {
      showNotification('Registration successful! Please check your email to verify your account.', 'success');
      
      // Clear registration form first
      usernameInput.value = '';
      emailInput.value = '';
      passwordInput.value = '';
      
      // Switch back to login form after a short delay
      setTimeout(() => {
        const container = document.querySelector('.container') as HTMLElement;
        if (container) {
          switchToLogin(container);
        }
      }, 1000);
      
    } else {
      showNotification(response.message || 'Registration failed', 'error');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showNotification('Network error. Please try again.', 'error');
  } finally {
    // Reset button state
    registerBtn.textContent = originalText;
    registerBtn.disabled = false;
  }
}

function handleSocialLogin(platform: string): void {
  // Redirect to OAuth provider
  const redirectUrl = `${API_BASE_URL}/auth/${platform}`;
  window.location.href = redirectUrl;
  
  // Or show modal/popup for OAuth flow
  // const popup = window.open(redirectUrl, 'oauth', 'width=600,height=600');
  // Handle popup response...
}

// API Functions
async function apiLogin(credentials: LoginRequest): Promise<AuthResponse> {
  // Mock API call - simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock successful response
  if (credentials.username === "demo" && credentials.password === "password") {
    return {
      success: true,
      message: "Login successful",
      token: "mock-jwt-token-" + Date.now(),
      user: {
        id: "1",
        username: credentials.username,
        email: "demo@example.com",
        picture: "https://lh3.googleusercontent.com/a/ACg8ocK_x-0_p_p_p_p_p_p_p_p_p_p_p_p_p_p_p_p_p_p_p_p_p_p_p_p-c-k-c0x00000000-cc-rp-mo-ba4"
      }
    };
  } else {
    return {
      success: false,
      message: "Invalid username or password"
    };
  }
}

async function apiRegister(userData: RegisterRequest): Promise<AuthResponse> {
  // Mock API call - simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock validation
  if (userData.username.length < 3) {
    return {
      success: false,
      message: "Username must be at least 3 characters long"
    };
  }
  
  // Mock successful response
  return {
    success: true,
    message: "Registration successful! Please check your email to verify your account.",
    token: "mock-jwt-token-" + Date.now(),
    user: {
      id: "2",
      username: userData.username,
      email: userData.email
    }
  };
}

// Utility Functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

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
    notification.classList.add('translate-x-0');
  }, 100);
  
  // Remove notification after 5 seconds (longer for registration success)
  const timeout = type === 'success' && message.includes('Registration') ? 5000 : 3000;
  setTimeout(() => {
    notification.classList.remove('translate-x-0');
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, timeout);
}

// Auth utility functions
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

export function getCurrentUser(): any {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function logout(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  updateNavbar();
  // Force navigation to landing page
  setTimeout(() => {
    navigate('landing' as Screen);
  }, 100);
}

// Clean up event listeners when navigating away
export function cleanupAuthPage(): void {
  const container = document.querySelector('.container');
  if (container) {
    // Remove all event listeners by cloning and replacing the elements
    const registerBtn = document.querySelector('.register-btn');
    const loginBtn = document.querySelector('.login-btn');
    
    if (registerBtn) {
      const newRegisterBtn = registerBtn.cloneNode(true);
      registerBtn.parentNode?.replaceChild(newRegisterBtn, registerBtn);
    }
    
    if (loginBtn) {
      const newLoginBtn = loginBtn.cloneNode(true);
      loginBtn.parentNode?.replaceChild(newLoginBtn, loginBtn);
    }
  }
}

// Add this function to handle missing icons
export function ensureIconsLoaded(): void {
  // Check if Boxicons are loaded, if not add fallback text
  setTimeout(() => {
    const icons = document.querySelectorAll('.bx');
    icons.forEach(icon => {
      // Check if the icon is actually displaying (has content)
      const computedStyle = window.getComputedStyle(icon);
      const fontFamily = computedStyle.getPropertyValue('font-family');
      
      if (!fontFamily.includes('boxicons')) {
        // Boxicons didn't load, add emoji fallback
        const className = icon.className;
        let fallbackText = '';
        
        if (className.includes('bxs-user')) fallbackText = '👤';
        else if (className.includes('bxs-lock-alt')) fallbackText = '🔒';
        else if (className.includes('bxs-envelope')) fallbackText = '📧';
        else if (className.includes('bxl-google')) fallbackText = '🇬';
        else if (className.includes('bxl-facebook')) fallbackText = '📘';
        else if (className.includes('bxl-github')) fallbackText = '🙀';
        else if (className.includes('bxl-linkedin')) fallbackText = '💼';
        
        if (fallbackText) {
          icon.textContent = fallbackText;
          (icon as HTMLElement).style.fontFamily = 'Arial, sans-serif';
          (icon as HTMLElement).style.fontSize = '16px';
          (icon as HTMLElement).style.lineHeight = '1';
        }
      }
    });
  }, 500);
}