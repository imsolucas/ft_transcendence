/**
 * Server-side validation utilities
 */

// Validation constants
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128; // Reasonable max for bcrypt
const MAX_EMAIL_LENGTH = 254; // RFC 5321 standard

// Username validation regex: alphanumeric, underscore, hyphen, 3-30 chars
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

// Email validation regex (RFC 5322 compliant)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Check length
  if (email.length > MAX_EMAIL_LENGTH) {
    return false;
  }
  
  // Check format
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates username format and length
 */
export function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }
  
  const trimmed = username.trim();
  
  // Check length
  if (trimmed.length < MIN_USERNAME_LENGTH || trimmed.length > MAX_USERNAME_LENGTH) {
    return false;
  }
  
  // Check format (alphanumeric, underscore, hyphen only)
  return USERNAME_REGEX.test(trimmed);
}

/**
 * Validates password length
 */
export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
}

/**
 * Validates all signup fields
 */
export function validateSignupInput(name: string, email: string, password: string): { valid: boolean; error?: string } {
  if (!name || !email || !password) {
    return { valid: false, error: "All fields are required." };
  }
  
  if (!isValidUsername(name)) {
    return { 
      valid: false, 
      error: `Username must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters and contain only letters, numbers, underscores, and hyphens.` 
    };
  }
  
  if (!isValidEmail(email)) {
    return { 
      valid: false, 
      error: "Invalid email format." 
    };
  }
  
  if (!isValidPassword(password)) {
    return { 
      valid: false, 
      error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.` 
    };
  }
  
  return { valid: true };
}

/**
 * Validates login input
 */
export function validateLoginInput(name: string, password: string): { valid: boolean; error?: string } {
  if (!name || !password) {
    return { valid: false, error: "Username and password are required." };
  }
  
  // Username validation (same as signup)
  if (!isValidUsername(name)) {
    return { 
      valid: false, 
      error: "Invalid username format." 
    };
  }
  
  // Password should not be empty (we don't validate length for login)
  if (password.length === 0) {
    return { valid: false, error: "Password is required." };
  }
  
  return { valid: true };
}

/**
 * Validates profile update fields
 */
export function validateProfileUpdate(username?: string, email?: string): { valid: boolean; error?: string } {
  if (username !== undefined) {
    if (!username || username.trim().length === 0) {
      return { valid: false, error: "Username cannot be empty." };
    }
    if (!isValidUsername(username)) {
      return { 
        valid: false, 
        error: `Username must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters and contain only letters, numbers, underscores, and hyphens.` 
      };
    }
  }
  
  if (email !== undefined) {
    if (!email || email.trim().length === 0) {
      return { valid: false, error: "Email cannot be empty." };
    }
    if (!isValidEmail(email)) {
      return { valid: false, error: "Invalid email format." };
    }
  }
  
  return { valid: true };
}

