import { updateNavbar } from '../components/layout/Navbar';
import { navigate } from '../router';
import { setAccessToken } from '../utils/tokenManager';

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
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:8443';

    // Send the Google credential to backend for verification
    const response = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      credentials: 'include', // Include cookies for refresh token
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
      showNotification((data && data.error) || `Google authentication failed (${response.status})`, 'error');
      return false;
    }

    if (data.token && data.user) {
      // Store access token in localStorage (persists across page reloads)
      setAccessToken(data.token);
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
