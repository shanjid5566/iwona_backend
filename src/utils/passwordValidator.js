import { ApiError } from './apiError.js';

/**
 * Validate password strength according to frontend validation rules
 * @param {string} password - The password to validate
 * @param {string} fieldName - The name of the field (e.g., 'Password', 'New password')
 * @throws {ApiError} If password doesn't meet requirements
 */
export const validatePassword = (password, fieldName = 'Password') => {
  const passwordErrors = [];
  
  if (password.length < 8) {
    passwordErrors.push('at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    passwordErrors.push('at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    passwordErrors.push('at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    passwordErrors.push('at least one number');
  }
  if (!/[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    passwordErrors.push('at least one special character (@#$%^&*()_+-=[]{};\':"|,.<>/?)');
  }
  
  if (passwordErrors.length > 0) {
    throw new ApiError(400, `${fieldName} must contain: ${passwordErrors.join(', ')}`);
  }
  
  return true;
};

/**
 * Check if password meets all requirements (returns boolean instead of throwing)
 * @param {string} password - The password to check
 * @returns {object} Object with validation results
 */
export const checkPasswordStrength = (password) => {
  return {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    isValid: password.length >= 8 &&
             /[A-Z]/.test(password) &&
             /[a-z]/.test(password) &&
             /[0-9]/.test(password) &&
             /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };
};
