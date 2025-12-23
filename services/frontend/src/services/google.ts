import { updateNavbar } from '../components/layout/Navbar';
import { navigate } from '../router';
import { setAccessToken, getCurrentUserId } from '../utils/tokenManager';
import { t } from '../i18n';

type CredentialResponse = google.accounts.id.CredentialResponse;

export interface GoogleIdTokenPayload {
  iss: string;  // The JWT's issuer
  aud: string;  // Your server's client ID
  sub: string;  // The unique ID of the user's Google Account
  iat: number;    // Unix timestamp of the assertion's creation time
  exp: number;    // Unix timestamp of the assertion's expiration time
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;   // If present, a URL to user's profile picture
  given_name?: string;
  family_name?: string;
  locale?: string;
  hd?: string;
}

export function loadGoogleSignInService(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById("google-client")) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "google-client";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
}

export function decodeJWT(token: string): GoogleIdTokenPayload {
  try {
    // Validate token format - should have 3 parts separated by dots
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format: expected 3 parts separated by dots');
    }

    // Extract and validate the payload part
    let base64Url = parts[1];
    if (!base64Url || base64Url.length === 0) {
      throw new Error('Invalid JWT token: empty payload');
    }

    // Convert base64url to base64
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if necessary (base64 strings should be multiples of 4)
    const padding = base64.length % 4;
    if (padding !== 0) {
      base64 += "=".repeat(4 - padding);
    }

    // Validate base64 string contains only valid characters
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(base64)) {
      throw new Error('Invalid JWT token: contains invalid base64 characters');
    }

    // Decode base64 to binary string
    let binaryString: string;
    try {
      binaryString = atob(base64);
    } catch (error) {
      if (error instanceof DOMException) {
        throw new Error(`Invalid JWT token: base64 decoding failed - ${error.message}`);
      }
      throw error;
    }

    // Convert binary string to URI-encoded string
    let jsonPayload: string;
    try {
      jsonPayload = decodeURIComponent(
        binaryString
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
    } catch (error) {
      throw new Error(`Invalid JWT token: URI decoding failed - ${error instanceof Error ? error.message : String(error)}`);
    }

    // Parse JSON payload
    try {
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error(`Invalid JWT token: JSON parsing failed - ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Invalid JWT token: unknown error occurred');
  }
}

export async function handleCredentialResponse(response: CredentialResponse): Promise<void> {
  try {
    // Validate credential exists
    if (!response.credential || typeof response.credential !== 'string') {
      console.error('Invalid Google credential response:', response);
      showNotification('Google Sign-In failed: Invalid credential received. Please try again.', 'error');
      return;
    }

    console.log("Encoded JWT ID token: " + response.credential);

    // Decode JWT token with proper error handling
    let responsePayload: GoogleIdTokenPayload;
    try {
      responsePayload = decodeJWT(response.credential);
    } catch (error) {
      // Specific error handling for JWT decoding failures
      console.error('Error decoding Google JWT token:', error);
      if (error instanceof Error) {
        showNotification(`Google Sign-In failed: ${error.message}`, 'error');
      } else {
        showNotification('Google Sign-In failed: Invalid token format. Please try again.', 'error');
      }
      return;
    }

    console.log("Decoded JWT ID token fields:");
    console.log("  Full Name        : " + responsePayload.name);
    console.log("  Given Name       : " + responsePayload.given_name);
    console.log("  Family Name      : " + responsePayload.family_name);
    console.log("  Unique ID        : " + responsePayload.sub);
    console.log("  Profile image URL: " + responsePayload.picture);
    console.log("  Email            : " + responsePayload.email);

    // Check if another user is already logged in
    const currentUserId = getCurrentUserId();
    if (currentUserId !== null) {
      // Another user is logged in - warn but allow login (will switch users)
      const confirmSwitch = confirm('Another user is already logged in. Logging in will switch to the new user. Continue?');
      if (!confirmSwitch) {
        return;
      }
    }

    // Process the Google authentication
    const success = await processGoogleAuth(responsePayload, response.credential);

    if (success) {
      // Show success notification
      showNotification('Google Sign-In successful!', 'success');

      // Update navbar and navigate to lobby page
      updateNavbar();

      setTimeout(() => {
        navigate('lobby');
      }, 1500);
    }
  } catch (error) {
    // Catch any unexpected errors
    console.error('Error handling Google credential:', error);
    if (error instanceof Error) {
      showNotification(`Google Sign-In failed: ${error.message}`, 'error');
    } else {
      showNotification('Google Sign-In failed. Please try again.', 'error');
    }
  }
}

async function processGoogleAuth(_payload: GoogleIdTokenPayload, credential: string): Promise<boolean> {
  try {
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:8443';

    // Send the Google credential to backend for verification
    let response: Response;
    try {
      response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: credential }),
      });
    } catch (error) {
      // Network error (connection failed, CORS, etc.)
      console.error('Network error during Google authentication:', error);
      showNotification('Network error: Unable to connect to server. Please check your connection and try again.', 'error');
      return false;
    }

    let data: any = null;
    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
      }
    } catch (parseError) {
      // JSON parsing error
      console.error('Error parsing response from Google auth endpoint:', parseError);
      showNotification('Server error: Invalid response format. Please try again.', 'error');
      return false;
    }

    if (!response.ok) {
      console.error('Google auth error:', data || response.statusText);
      const errorMessage = data?.error || `Google authentication failed (${response.status})`;
      
      // Show user-friendly error message
      if (response.status === 403 && data?.error?.includes('already logged in')) {
        showNotification(data?.message || 'You are already logged in on another device or browser. Please log out from the other device before logging in here.', 'error');
      } else {
        showNotification(errorMessage, 'error');
      }
      return false;
    }

    // Check if password is required (OAuth user without password)
    if (response.status === 202 && data?.passwordRequired) {
      // Validate response data structure before showing modal
      if (!data.userId || !data.username || !data.email) {
        console.error('Invalid password required response:', data);
        showNotification('Server error: Invalid response data. Please try again.', 'error');
        return false;
      }
      // Show password setup modal
      showPasswordSetupModal(data);
      return false; // Don't navigate yet, wait for password to be set
    }

    if (data?.token && data?.user) {
      // Validate user object structure
      if (!data.user.id || !data.user.username || !data.user.email) {
        console.error('Invalid user data in response:', data.user);
        showNotification('Server error: Invalid user data. Please try again.', 'error');
        return false;
      }

      // Store access token in localStorage (persists across page reloads)
      const previousUserId = getCurrentUserId();
      setAccessToken(data.token, data.user.id);
      
      // If different user was logged in, show notification
      if (previousUserId && previousUserId !== data.user.id) {
        showNotification('Another user was logged in. You have been logged in as ' + data.user.username, 'info');
      }
      return true;
    } else {
      console.error('Invalid response from backend:', data);
      showNotification('Invalid response from server. Please try again.', 'error');
      return false;
    }
  } catch (error) {
    // Catch any unexpected errors
    console.error('Error processing Google authentication:', error);
    
    // Provide specific error messages based on error type
    if (error instanceof TypeError && error.message.includes('fetch')) {
      showNotification('Network error: Unable to connect to server. Please check your connection and try again.', 'error');
    } else if (error instanceof Error) {
      showNotification(`Authentication error: ${error.message}`, 'error');
    } else {
      showNotification('An unexpected error occurred. Please try again.', 'error');
    }
    return false;
  }
}

// Utility function to show notifications (reused from auth-script)
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

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('translate-x-0');
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Helper function to sanitize string for safe DOM usage
function sanitizeString(str: string | null | undefined, defaultValue: string = ''): string {
  if (str === null || str === undefined) {
    return defaultValue;
  }
  // Convert to string and trim
  const sanitized = String(str).trim();
  // Return default if empty after trimming
  return sanitized || defaultValue;
}

// Show password setup modal for OAuth users
function showPasswordSetupModal(data: { userId: number; username: string; email: string; avatar: string; message: string }): void {
  // Validate required data fields
  if (!data || typeof data !== 'object') {
    console.error('Invalid data passed to showPasswordSetupModal:', data);
    showNotification('Error: Invalid data received. Please try again.', 'error');
    return;
  }

  if (typeof data.userId !== 'number' || data.userId <= 0) {
    console.error('Invalid userId in showPasswordSetupModal:', data.userId);
    showNotification('Error: Invalid user ID. Please try again.', 'error');
    return;
  }

  // Sanitize string values
  const email = sanitizeString(data.email, '');
  const message = sanitizeString(data.message, 'Please set a password to secure your account and continue.');

  // Validate email format if provided
  if (email && !email.includes('@')) {
    console.warn('Invalid email format in showPasswordSetupModal:', email);
  }

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm';
  
  // Add Stimulus controller for modal functionality
  modal.setAttribute('data-controller', 'modal');
  modal.setAttribute('data-modal-open-value', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'absolute inset-0 bg-black/50';
  backdrop.setAttribute('data-modal-target', 'backdrop');
  backdrop.setAttribute('data-action', 'click->modal#closeOnBackdrop');
  modal.appendChild(backdrop);

  const container = document.createElement('div');
  container.className = 'relative max-w-md w-full mx-4 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700';
  container.setAttribute('data-modal-target', 'container');
  container.setAttribute('data-action', 'click->modal#stopPropagation');

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between p-6 border-b border-gray-700';
  
  const title = document.createElement('h2');
  title.className = 'text-xl font-semibold text-white';
  title.textContent = String(t('auth.passwordRequired') || 'Password Required');
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.className = 'text-gray-400 hover:text-white text-3xl leading-none transition-colors';
  closeBtn.setAttribute('data-action', 'click->modal#close');
  header.appendChild(closeBtn);
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'p-6 space-y-4';

  const messageElement = document.createElement('p');
  messageElement.className = 'text-gray-300';
  // Use the sanitized message from data, or fallback to translation/default
  messageElement.textContent = message || String(t('auth.passwordRequiredMessage') || 'Please set a password to secure your account and continue.');
  body.appendChild(messageElement);

  const form = document.createElement('form');
  form.className = 'space-y-4';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Validate userId is still valid before submitting
    if (typeof data.userId === 'number' && data.userId > 0) {
      await handleSetPassword(data.userId, passwordInput.value, modal);
    } else {
      showNotification('Error: Invalid user ID. Please refresh and try again.', 'error');
    }
  });

  const passwordLabel = document.createElement('label');
  passwordLabel.className = 'block text-sm font-medium text-gray-300 mb-2';
  passwordLabel.textContent = String(t('auth.setPassword') || 'Password (minimum 6 characters)');
  form.appendChild(passwordLabel);

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.required = true;
  passwordInput.minLength = 6;
  passwordInput.className = 'w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  passwordInput.placeholder = String(t('auth.enterPassword') || 'Enter your password');
  form.appendChild(passwordInput);

  const confirmLabel = document.createElement('label');
  confirmLabel.className = 'block text-sm font-medium text-gray-300 mb-2';
  confirmLabel.textContent = String(t('auth.confirmPassword') || 'Confirm Password');
  form.appendChild(confirmLabel);

  const confirmInput = document.createElement('input');
  confirmInput.type = 'password';
  confirmInput.required = true;
  confirmInput.minLength = 6;
  confirmInput.className = 'w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  confirmInput.placeholder = String(t('auth.confirmPasswordPlaceholder') || 'Confirm your password');
  form.appendChild(confirmInput);

  const errorMsg = document.createElement('div');
  errorMsg.className = 'hidden text-red-400 text-sm';
  form.appendChild(errorMsg);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors';
  submitBtn.textContent = String(t('auth.setPassword') || 'Set Password');
  form.appendChild(submitBtn);

  body.appendChild(form);
  container.appendChild(body);
  modal.appendChild(container);
  document.body.appendChild(modal);

  // Validate password match
  confirmInput.addEventListener('input', () => {
    if (passwordInput.value !== confirmInput.value) {
      errorMsg.textContent = String(t('auth.passwordMismatch') || 'Passwords do not match');
      errorMsg.classList.remove('hidden');
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      errorMsg.classList.add('hidden');
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  });

  passwordInput.addEventListener('input', () => {
    if (passwordInput.value.length < 6) {
      errorMsg.textContent = String(t('auth.passwordMinLength') || 'Password must be at least 6 characters');
      errorMsg.classList.remove('hidden');
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else if (passwordInput.value !== confirmInput.value && confirmInput.value.length > 0) {
      errorMsg.textContent = String(t('auth.passwordMismatch') || 'Passwords do not match');
      errorMsg.classList.remove('hidden');
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else if (passwordInput.value === confirmInput.value && confirmInput.value.length >= 6) {
      errorMsg.classList.add('hidden');
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  });
}

// Handle setting password for OAuth users
async function handleSetPassword(userId: number, password: string, modal: HTMLElement): Promise<void> {
  try {
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:8443';
    
    const response = await fetch(`${API_URL}/auth/set-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle 403 - User already logged in on another device
      if (response.status === 403 && data?.error?.includes('already logged in')) {
        showNotification(data?.message || 'You are already logged in on another device or browser. Please log out from the other device before setting a password here.', 'error');
      } else {
      showNotification(data.error || 'Failed to set password', 'error');
      }
      return;
    }

    if (data.token && data.user) {
      // Store access token
      const previousUserId = getCurrentUserId();
      setAccessToken(data.token, data.user.id);
      
      // If different user was logged in, show notification
      if (previousUserId && previousUserId !== data.user.id) {
        showNotification('Another user was logged in. You have been logged in as ' + data.user.username, 'info');
      }
      
      // Close modal using Stimulus controller
      const application = (window as any).Stimulus?.application;
      if (application) {
        const controller = application.getControllerForElementAndIdentifier(modal, 'modal');
        if (controller) {
          controller.close();
        } else {
          modal.remove();
        }
      } else {
        modal.remove();
      }

      // Show success and navigate
      showNotification(String(t('auth.passwordSetSuccess') || 'Password set successfully!'), 'success');
      updateNavbar();
      
      setTimeout(() => {
        navigate('lobby');
      }, 1500);
    }
  } catch (error) {
    console.error('Error setting password:', error);
    showNotification('Network error. Please try again.', 'error');
  }
}
