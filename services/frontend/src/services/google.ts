import { updateNavbar } from '../components/layout/Navbar';
import { navigate } from '../router';
import { setAccessToken, getCurrentUserId } from '../utils/tokenManager';
import { t } from '../i18n';
import { API_BASE_URL } from '../utils/api';

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
    let base64Url = token.split(".")[1];
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    let jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    throw new Error('Invalid JWT token');
  }
}

export async function handleCredentialResponse(response: CredentialResponse): Promise<void> {
  try {
    console.log("Encoded JWT ID token: " + response.credential);

    const responsePayload = decodeJWT(response.credential);

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
    console.error('Error handling Google credential:', error);
    showNotification('Google Sign-In failed. Please try again.', 'error');
  }
}

async function processGoogleAuth(payload: GoogleIdTokenPayload, credential: string): Promise<boolean> {
  try {
    // Send the Google credential to backend for verification
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: credential }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch (_) {
      // Non-JSON error or empty body
      data = null;
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
    if (response.status === 202 && data.passwordRequired) {
      // Show password setup modal
      showPasswordSetupModal(data);
      return false; // Don't navigate yet, wait for password to be set
    }

    if (data.token && data.user) {
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
      showNotification('Invalid response from server', 'error');
      return false;
    }
  } catch (error) {
    console.error('Error processing Google authentication:', error);
    showNotification('Network error. Please try again.', 'error');
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

// Show password setup modal for OAuth users
function showPasswordSetupModal(data: { userId: number; username: string; email: string; avatar: string; message: string }): void {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm';
  modal.setAttribute('x-data', '{ open: true }');
  modal.setAttribute('x-show', 'open');
  modal.setAttribute('x-transition', '');

  const backdrop = document.createElement('div');
  backdrop.className = 'absolute inset-0 bg-black/50';
  backdrop.setAttribute('@click', 'open = false');
  backdrop.addEventListener('click', () => {
    if (window.Alpine && modal.__x) {
      modal.__x.$data.open = false;
      setTimeout(() => modal.remove(), 200);
    } else {
      modal.remove();
    }
  });
  modal.appendChild(backdrop);

  const container = document.createElement('div');
  container.className = 'relative max-w-md w-full mx-4 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700';
  container.setAttribute('@click.stop', '');

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between p-6 border-b border-gray-700';
  
  const title = document.createElement('h2');
  title.className = 'text-xl font-semibold text-white';
  title.textContent = String(t('auth.passwordRequired') || 'Password Required');
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.className = 'text-gray-400 hover:text-white text-3xl leading-none transition-colors';
  closeBtn.setAttribute('@click', 'open = false');
  closeBtn.addEventListener('click', () => {
    if (window.Alpine && modal.__x) {
      modal.__x.$data.open = false;
      setTimeout(() => modal.remove(), 200);
    } else {
      modal.remove();
    }
  });
  header.appendChild(closeBtn);
  container.appendChild(header);

  const body = document.createElement('div');
  body.className = 'p-6 space-y-4';

  const message = document.createElement('p');
  message.className = 'text-gray-300';
  message.textContent = String(t('auth.passwordRequiredMessage') || 'Please set a password to secure your account and continue.');
  body.appendChild(message);

  const form = document.createElement('form');
  form.className = 'space-y-4';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleSetPassword(data.userId, passwordInput.value, modal);
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
    const response = await fetch(`${API_BASE_URL}/auth/set-password`, {
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
      
      // Close modal
      if (window.Alpine && modal.__x) {
        modal.__x.$data.open = false;
        setTimeout(() => modal.remove(), 200);
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
