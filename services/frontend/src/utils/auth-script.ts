import { navigate } from '../router';
import type { Screen } from '../router';
import { updateNavbar } from '../components/layout/Navbar';
import type { UserData } from '../types/user';
import { getAccessToken, clearAccessToken, setAccessToken } from './tokenManager';

// Types for API requests/responses
interface LoginRequest {
  name: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
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
  twoFARequired?: boolean;
  userId?: number;
}

interface BackendLoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    avatar: string;
  };
}

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

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

  const name = usernameInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!name || !password) {
    showNotification('Please fill in all fields', 'error');
    return;
  }

  // Show loading state
  loginBtn.textContent = 'Logging in...';
  loginBtn.disabled = true;

  try {
    const response = await apiLogin({ name, password });

    if (response.success) {
      // Store auth token (using new token manager)
      if (response.token && response.user) {
        setAccessToken(response.token);
        // User data is fetched from API when needed, not stored in localStorage
      }

      showNotification('Login successful!', 'success');

      // Update navbar to show logged-in state
      updateNavbar();

      // Navigate to lobby page after successful login
      setTimeout(() => {
        navigate('lobby' as Screen);
      }, 1500);
    } else {
      showNotification(response.message || 'Login failed', 'error');
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification('Network error. Please try again.', 'error');
  } finally {
    // Reset button state
    loginBtn.textContent = "► LOGIN";
    loginBtn.disabled = false;
  }
}

async function handleRegistration(): Promise<void> {
  const usernameInput = document.querySelector('.form-box.register input[type="text"]') as HTMLInputElement;
  const emailInput = document.querySelector('.form-box.register input[type="email"]') as HTMLInputElement;
  const passwordInput = document.querySelector('.form-box.register input[type="password"]') as HTMLInputElement;
  const registerBtn = document.querySelector('.register-submit-btn') as HTMLButtonElement;

  const name = usernameInput?.value.trim();
  const email = emailInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!name || !email || !password) {
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
    const response = await apiRegister({ name, email, password });

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
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include', // Include cookies - critical for refresh token!
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: credentials.name,
        password: credentials.password,
      }),
    });

    // Handle 202 status - 2FA required
    if (response.status === 202) {
      const data = await response.json();
      return {
        success: false,
        message: '2FA verification required',
        twoFARequired: true,
        userId: data.id,
      };
    }

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

async function apiRegister(userData: RegisterRequest): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      return {
        success: false,
        message: errorData.error || 'Registration failed',
      };
    }

    // Signup returns 201, but we need to login to get token
    // For now, return success and let user login
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
  return getAccessToken();
}

export async function getCurrentUser(): Promise<UserData | null> {
	try {
	  // Always fetch from backend - no localStorage caching
	  const token = getAuthToken();
	  if (!token) {
		return null;
	  }

	  const response = await fetch(`${API_BASE_URL}/user/profile`, {
		method: 'GET',
		credentials: 'include', // Include cookies for consistency
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json',
		},
	  });

      if (response.ok) {
		const userData = await response.json();
		const user: UserData = {
		  id: userData.id,
		  username: userData.username || userData.name,
		  email: userData.email,
		  picture: userData.avatar,
		  avatar: userData.avatar, // Store both for compatibility
		};
		// No longer storing in localStorage
		return user;
	  }

	  // Handle 401 - token might be expired, but don't try to refresh here
	  // to avoid circular dependency with api.ts
	  if (response.status === 401) {
		console.warn("getCurrentUser: Unauthorized - token may be expired");
		return null;
	  }

	  return null;
	} catch (error) {
	  console.error("Error fetching current user:", error);
	  return null;
	}
  }


export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

import { setUserStatus } from './api';

export async function logout(): Promise<void> {
  try {
    // Call backend logout endpoint to invalidate tokens
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    const token = getAccessToken();
    
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Include cookies (refresh token)
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      // No Content-Type header and no body - logout doesn't need a body
    }).catch(() => {
      // Ignore errors - continue with local cleanup
    });
  } catch (error) {
    console.error('Logout API error:', error);
  } finally {
    // Clear local state regardless of API call success
    clearAccessToken();
    
    // Try to mark user offline (non-blocking)
    setUserStatus('OFFLINE', { keepalive: true }).catch(() => {
      // Ignore errors
    });
    
    updateNavbar();
    // Force navigation to landing page
    setTimeout(() => {
      navigate('landing' as Screen);
    }, 100);
  }
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
