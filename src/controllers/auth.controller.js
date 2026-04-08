import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';


/**
 * Register a new user
 */
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, homeAirport } = req.body;
  
  const result = await authService.register({ firstName, lastName, email, password, homeAirport });
  
  res.status(201).json(
    ApiResponse.success(result.message, { user: result.user })
  );
});

/**
 * Verify OTP and get payment link
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, code, amount } = req.body; // amount is optional
  
  // Extract origin from request
  let origin = req.get('origin');
  if (!origin && req.get('referer')) {
    try {
      const refererUrl = new URL(req.get('referer'));
      origin = `${refererUrl.protocol}//${refererUrl.host}`;
    } catch (e) {
      console.error('Error parsing referer:', e);
    }
  }
  
  const result = await authService.verifyOTP({ email, code, amount, origin });
  
  res.status(200).json(
    ApiResponse.success(result.message, result)
  );
});

/**
 * Resend OTP code
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const result = await authService.resendOTP({ email });
  
  res.status(200).json(
    ApiResponse.success(result.message)
  );
});

/**
 * Login user
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  const result = await authService.login(email, password);
  
  res.status(200).json(
    ApiResponse.success('Login successful', result)
  );
});

/**
 * Logout user
 */
const logout = asyncHandler(async (req, res) => {
  // In a stateless JWT setup, logout is handled client-side
  // If using refresh tokens stored in DB, invalidate them here
  
  res.status(200).json(
    ApiResponse.success('Logout successful')
  );
});

/**
 * Request password reset
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const result = await authService.forgotPassword(email);
  
  res.status(200).json(
    ApiResponse.success(result.message)
  );
});

/**
 * Verify password reset OTP
 */
const verifyResetOTP = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  
  const result = await authService.verifyResetOTP(email, code);
  
  res.status(200).json(
    ApiResponse.success(result.message, { resetToken: result.resetToken })
  );
});

/**
 * Reset password with OTP
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;
  
  const result = await authService.resetPassword(resetToken, newPassword);
  
  res.status(200).json(
    ApiResponse.success(result.message)
  );
});


export { register, verifyOTP, resendOTP, login, logout, forgotPassword, verifyResetOTP, resetPassword };
