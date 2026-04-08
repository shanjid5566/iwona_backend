import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import prisma from '../config/database.js';
import config from '../config/index.js';
import { ApiError } from '../utils/apiError.js';
import { validatePassword } from '../utils/passwordValidator.js';
import { generateOTP, sendOTPEmail, sendPasswordResetEmail } from './email.service.js';

// Initialize Stripe with validation
if (!config.stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}
const stripe = new Stripe(config.stripeSecretKey);

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  return token;
};


/**
 * Step 1: Register User (Send OTP)
 */
const register = async ({ email, password, firstName, lastName, homeAirport }) => {
  if (!email || !password || !firstName || !lastName) {
    throw new ApiError(400, 'All fields are required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Invalid email format');
  }

  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new ApiError(400, 'Email already registered');
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName,
      homeAirport: homeAirport || null,
      status: 'PENDING',
      isEmailVerified: false,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      homeAirport: true,
      role: true,
      status: true,
      isEmailVerified: true,
      createdAt: true,
    },
  });

  // Generate OTP
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      code: otpCode,
      expiresAt,
    },
  });

  // Send OTP
  console.log(`📧 Attempting to send OTP to ${user.email}...`);
  try {
    await sendOTPEmail(user.email, otpCode, user.firstName);
    console.log(`✅ OTP email sent successfully to ${user.email}`);
    console.log(`🔑 OTP Code (for testing): ${otpCode}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error('Full error:', error);
    // Don't throw error - allow registration to continue even if email fails
  }

  return {
    user,
    message: 'Registration successful! Check your email for verification code.',
  };
};

/**
 * Step 2: Verify OTP and create payment session
 * @param {string} email - User email
 * @param {string} code - OTP code
 * @param {number} amount - Optional payment amount (defaults to config value)
 * @param {string} origin - Origin URL from request (optional)
 */
const verifyOTP = async ({ email, code, amount = null, origin = null }) => {
  if (!email || !code) {
    throw new ApiError(400, 'Email and code are required');
  }

  // Use provided amount or default from config
  const paymentAmount = amount || config.defaultPaymentAmount;
  
  // Determine the redirect origin (use request origin or fall back to first configured origin)
  const redirectOrigin = origin || (Array.isArray(config.corsOrigin) ? config.corsOrigin[0] : config.corsOrigin);

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Handle already verified users
  if (user.isEmailVerified) {
    // If user is ACTIVE, they already completed registration and payment
    if (user.status === 'ACTIVE') {
      throw new ApiError(400, 'Email already verified and payment completed. Please login.');
    }

    // If user is PENDING, they verified email but didn't complete payment
    // Allow them to get a new payment session
    if (user.status === 'PENDING') {
      console.log('🔄 User already verified but payment pending. Creating new payment session...');
      
      const token = generateToken(user);

      try {
        const unitAmountCents = paymentAmount >= 100
          ? Math.round(paymentAmount)              // already in cents (e.g. 999)
          : Math.round(paymentAmount * 100);       // convert euros to cents (e.g. 9.99 → 999)

        console.log('🔵 Creating Stripe subscription session for verified user:', {
          email: user.email,
          userId: user.id,
          amount: paymentAmount,
          currency: config.paymentCurrency,
          redirectOrigin: redirectOrigin,
        });

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'subscription',
          customer_email: user.email,
          client_reference_id: user.id,
          line_items: [
            {
              price_data: {
                currency: config.paymentCurrency || 'eur',
                unit_amount: unitAmountCents,  // e.g. 999 for €9.99
                recurring: {
                  interval: 'year',
                  interval_count: 1,
                },
                product_data: {
                  name: 'Travel in a Click',
                },
              },
              quantity: 1,
            },
          ],
          success_url: `${redirectOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${redirectOrigin}/payment/cancel`,
          metadata: {
            userId: user.id,
            email: user.email,
            planName: 'Annual Membership',
            amount: paymentAmount.toString(),
          },
        });

        console.log('✅ New Stripe session created for retry:', session.id);

        return {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            isEmailVerified: true,
            status: user.status,
          },
          token,
          payment: {
            sessionId: session.id,
            url: session.url,
            publishableKey: config.stripePublishableKey,
            amount: paymentAmount,
            currency: config.paymentCurrency,
          },
          message: 'Email already verified. Please complete your payment.',
        };
      } catch (error) {
        console.error('❌ Stripe error:', error);
        throw new ApiError(500, `Failed to create payment session: ${error.message}`);
      }
    }
  }

  // First-time verification: Check OTP validity
  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId: user.id,
      code: code.toString(),
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!verification) {
    throw new ApiError(400, 'Invalid or expired code');
  }

  // Update verification status and user email verification
  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { isUsed: true },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    }),
  ]);

  const token = generateToken(user);

  // Create Stripe Checkout Session immediately after OTP verification
  try {
    const unitAmountCents = paymentAmount >= 100
      ? Math.round(paymentAmount)              // already in cents (e.g. 999)
      : Math.round(paymentAmount * 100);       // convert euros to cents (e.g. 9.99 → 999)

    console.log('🔵 Creating Stripe subscription session with:', {
      email: user.email,
      userId: user.id,
      amount: paymentAmount,
      currency: config.paymentCurrency,
      redirectOrigin: redirectOrigin,
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Apple Pay is automatic on Safari/iOS
      mode: 'subscription',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: config.paymentCurrency || 'eur',
            unit_amount: unitAmountCents,  // e.g. 999 for €9.99
            recurring: {
              interval: 'year',
              interval_count: 1,
            },
            product_data: {
              name: 'Travel in a Click',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${redirectOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${redirectOrigin}/payment/cancel`,
      metadata: {
        userId: user.id,
        email: user.email,
        planName: 'Annual Membership',
        amount: paymentAmount.toString(),
      },
    });

    console.log('✅ Stripe session created:', session.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        isEmailVerified: true,
        status: user.status,
      },
      token,
      payment: {
        sessionId: session.id,
        url: session.url,
        publishableKey: config.stripePublishableKey,
        amount: paymentAmount,
        currency: config.paymentCurrency,
      },
      message: 'Email verified! Redirecting to payment...',
    };
  } catch (error) {
    console.error('❌ Stripe error:', error);
    const errorMessage = error.message || 'Unknown Stripe error';
    throw new ApiError(
      500, 
      `Email verified but failed to create payment session: ${errorMessage}`
    );
  }
};

/**
 * Resend OTP
 */
const resendOTP = async ({ email }) => {
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'Email already verified');
  }

  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  console.log(`🔑 Resend OTP for ${user.email}: ${otpCode}`);

  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      code: otpCode,
      expiresAt,
    },
  });

  try {
    await sendOTPEmail(user.email, otpCode, user.firstName);
  } catch (error) {
    console.error('Email error:', error);
    throw new ApiError(500, 'Failed to send email');
  }

  return { message: 'Code resent successfully' };
};


/**
 * Login user
 */
const login = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    throw new ApiError(401, 'Invalid email');
  }
  // Allow INACTIVE users to login so they can renew expired subscriptions
  // Protected routes will still block them based on subscription status
  if (user.status !== 'ACTIVE' && user.status !== 'INACTIVE') {
    throw new ApiError(403, 'User account is not active');
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid password');
  }
  const token = generateToken(user);
  return { token, user };
};

/**
 * Request password reset - Send 4-digit OTP via email
 */
const forgotPassword = async (email) => {
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new ApiError(404, 'No account found with this email address');
  }

  // Generate 4-digit OTP (same as email verification)
  const otp = generateOTP();
  console.log(`🔐 Password Reset OTP for ${user.email}: ${otp}`);

  // Set expiration to 10 minutes from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  // Delete any existing unused OTP for password reset (same table as email verification)
  await prisma.emailVerification.deleteMany({
    where: {
      userId: user.id,
      isUsed: false,
    },
  });

  // Create new OTP record for password reset
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      code: otp,
      expiresAt: expiresAt,
    },
  });

  // Send password reset OTP email
  try {
    await sendPasswordResetEmail(user.email, user.firstName, otp);
  } catch (emailError) {
    console.error('Failed to send password reset email:', emailError);
    throw new ApiError(500, 'Failed to send password reset email');
  }

  return {
    message: 'Password reset code has been sent to your email.',
  };
};

/**
 * Verify password reset OTP
 */
const verifyResetOTP = async (email, code) => {
  if (!email || !code) {
    throw new ApiError(400, 'Email and verification code are required');
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Find valid OTP
  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId: user.id,
      code: code,
      isUsed: false,
      expiresAt: {
        gt: new Date(), // OTP must not be expired
      },
    },
  });

  if (!verification) {
    throw new ApiError(400, 'Invalid or expired verification code');
  }

  // Generate a temporary reset token (valid for 5 minutes)
  const resetToken = jwt.sign(
    { 
      userId: user.id,
      verificationId: verification.id,
      type: 'password-reset'
    },
    config.jwtSecret,
    { expiresIn: '5m' } // 5 minutes only
  );

  return {
    message: 'Verification code is valid. You can now reset your password.',
    resetToken,
  };
};

/**
 * Reset password with reset token
 */
const resetPassword = async (resetToken, newPassword) => {
  if (!resetToken || !newPassword) {
    throw new ApiError(400, 'Reset token and new password are required');
  }

  // Validate new password strength
  validatePassword(newPassword, 'New password');

  // Verify reset token
  let decoded;
  try {
    decoded = jwt.verify(resetToken, config.jwtSecret);
    
    if (decoded.type !== 'password-reset') {
      throw new ApiError(400, 'Invalid reset token');
    }
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(400, 'Reset token has expired. Please request a new OTP.');
    }
    throw new ApiError(400, 'Invalid reset token');
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Verify the OTP is still valid and not used
  const verification = await prisma.emailVerification.findFirst({
    where: {
      id: decoded.verificationId,
      userId: user.id,
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!verification) {
    throw new ApiError(400, 'Invalid or expired reset session. Please request a new OTP.');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  // Update user password and mark OTP as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    }),
    prisma.emailVerification.update({
      where: { id: verification.id },
      data: { isUsed: true },
    }),
  ]);

  return {
    message: 'Password has been reset successfully. You can now login with your new password.',
  };
};

export {register, verifyOTP, resendOTP, login, forgotPassword, verifyResetOTP, resetPassword, generateToken };
