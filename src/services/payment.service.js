import Stripe from 'stripe';
import prisma from '../config/database.js';
import config from '../config/index.js';
import { ApiError } from '../utils/apiError.js';
import { validatePassword } from '../utils/passwordValidator.js';
import { sendWelcomeEmail } from './email.service.js';

// Initialize Stripe with only secret key
const stripe = new Stripe(config.stripeSecretKey);

/**
 * Create Stripe Checkout Session
 * @param {string} userId - User ID
 * @param {number} amount - Payment amount in EUR (optional, defaults to config value)
 * @param {string} origin - Origin URL from request (optional)
 */
export const createCheckoutSession = async (userId, amount = null, origin = null) => {
  // Use provided amount or default
  const paymentAmount = amount || config.defaultPaymentAmount;
  
  // Determine the redirect origin (use request origin or fall back to first configured origin)
  const redirectOrigin = origin || (Array.isArray(config.corsOrigin) ? config.corsOrigin[0] : config.corsOrigin);
  
  console.log('🔄 Redirect Origin Logic:');
  console.log('   - Received origin:', origin);
  console.log('   - Config CORS origins:', config.corsOrigin);
  console.log('   - Final redirect origin:', redirectOrigin);
  
  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      isEmailVerified: true,
      status: true,
    },
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email first');
  }

  // Check if already paid
  if (user.status === 'ACTIVE') {
    throw new ApiError(400, 'Subscription already active');
  }

  try {
    // Convert payment amount to cents for Stripe
    const unitAmountCents = paymentAmount >= 100
      ? Math.round(paymentAmount)              // already in cents (e.g. 999)
      : Math.round(paymentAmount * 100);       // convert euros to cents (e.g. 9.99 → 999)

    // Create Stripe Checkout Session with Subscription
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

    console.log('✅ Checkout session created successfully:', {
      sessionId: session.id,
      mode: session.mode,
      successUrl: `${redirectOrigin}/payment/success`,
      cancelUrl: `${redirectOrigin}/payment/cancel`,
      priceId: config.stripePriceId,
      subscriptionId: session.subscription
    });

    return {
      sessionId: session.id,
      url: session.url,
      publishableKey: config.stripePublishableKey,
      amount: paymentAmount,
      currency: config.paymentCurrency,
    };
  } catch (error) {
    console.error('❌ Stripe error:', error);
    throw new ApiError(500, 'Failed to create payment session');
  }
};

/**
 * Verify Payment and Activate User
 * Handles both new subscriptions and renewals
 */
export const verifyPayment = async (sessionId) => {
  if (!sessionId) {
    throw new ApiError(400, 'Session ID is required');
  }

  try {
    // Retrieve session from Stripe with subscription details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    });

    console.log('📋 Session retrieved:', {
      sessionId: session.id,
      mode: session.mode,
      paymentStatus: session.payment_status,
      subscriptionId: session.subscription,
      subscriptionType: typeof session.subscription,
      customerId: session.customer
    });

    if (session.payment_status !== 'paid') {
      throw new ApiError(400, 'Payment not completed');
    }

    const userId = session.metadata.userId;

    // Check if user exists and get their subscriptions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check for existing subscriptions
    const existingSubscriptions = user.subscriptions;
    const hasExpiredSubscription = existingSubscriptions.some(sub => sub.isExpired);
    const isRenewal = existingSubscriptions.length > 0;

    // Get amount from session metadata (in cents) and convert to euros
    const paidAmountInCents = parseFloat(session.metadata.amount || config.defaultPaymentAmount);
    const paidAmount = paidAmountInCents / 100; // Convert cents to euros (999 -> 9.99)

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year

    // Get subscription details from Stripe
    // Extract ID from subscription object (when expanded) or use string directly
    const stripeSubscriptionId = typeof session.subscription === 'object' && session.subscription !== null
      ? session.subscription.id
      : session.subscription;
    console.log('💳 Stripe Subscription ID:', stripeSubscriptionId);
    console.log('💳 Session ID:', session.id);

    if (!stripeSubscriptionId) {
      console.error('⚠️ WARNING: No subscription ID found in session!');
      console.error('Session details:', JSON.stringify(session, null, 2));
    }

    // Handle renewal: mark old subscriptions as renewed
    if (isRenewal) {
      console.log('🔄 Processing renewal for user:', userId);
      
      // Mark all previous subscriptions as renewed
      await prisma.subscription.updateMany({
        where: {
          userId: userId,
          isRenewed: false,
        },
        data: {
          isRenewed: true,
        },
      });
    }

    // Create new subscription and update user
    const [updatedUser, newSubscription, payment] = await prisma.$transaction([
      // Update user to ACTIVE
      prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          fullName: true,
          role: true,
          status: true,
          isEmailVerified: true,
          homeAirport: true,
          createdAt: true,
        },
      }),

      // Create new subscription
      prisma.subscription.create({
        data: {
          userId: userId,
          planName: 'Annual Membership',
          amount: paidAmount,
          startDate: startDate,
          endDate: endDate,
          isActive: true,
          isExpired: false,
          isRenewed: false,
          stripeSubId: stripeSubscriptionId || session.id,
        },
      }),

      // Create payment record
      prisma.payment.create({
        data: {
          userId: userId,
          transactionId: session.payment_intent || session.id,
          amount: paidAmount,
          status: 'SUCCESS',
          paymentMethod: 'card',
        },
      }),
    ]);

    // Send welcome email (only for first-time users)
    if (!isRenewal) {
      try {
        await sendWelcomeEmail(updatedUser.email, updatedUser.firstName);
      } catch (emailError) {
        console.error('Welcome email error:', emailError);
      }
    }

    const message = isRenewal 
      ? 'Subscription renewed successfully! Your account is now active.'
      : 'Payment successful! Your account is now active.';

    return {
      message,
      isRenewal,
      user: updatedUser,
      subscription: {
        planName: newSubscription.planName,
        amount: newSubscription.amount,
        startDate: newSubscription.startDate,
        endDate: newSubscription.endDate,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('❌ Payment verification error:', error);
    throw new ApiError(500, 'Failed to verify payment');
  }
};

/**
 * Get publishable key
 */
export const getPublishableKey = () => {
  return {
    publishableKey: config.stripePublishableKey,
  };
};

/**
 * Create Gift Subscription Checkout Session
 * @param {string} gifterId - User ID of the person gifting
 * @param {string} recipientEmail - Recipient's email address
 * @param {string} recipientPassword - Password for recipient's account
 * @param {string} recipientFirstName - Recipient's first name
 * @param {string} recipientLastName - Recipient's last name
 * @param {number} amount - Payment amount in EUR (optional)
 * @param {string} origin - Origin URL from request (optional)
 */
export const createGiftCheckoutSession = async (
  gifterId,
  recipientEmail,
  recipientPassword,
  recipientFirstName,
  recipientLastName,
  amount = null,
  origin = null
) => {
  // Validate required fields
  if (!recipientEmail || !recipientPassword || !recipientFirstName || !recipientLastName) {
    throw new ApiError(400, 'All recipient details are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    throw new ApiError(400, 'Invalid email format for recipient');
  }

  // Validate password length
  if (recipientPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }

  // Get gifter details
  const gifter = await prisma.user.findUnique({
    where: { id: gifterId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  });

  if (!gifter) {
    throw new ApiError(404, 'Gifter user not found');
  }

  // Check if recipient email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: recipientEmail.toLowerCase() },
  });

  if (existingUser) {
    throw new ApiError(400, 'An account with this email already exists');
  }

  // Use provided amount or default
  const paymentAmount = amount || config.defaultPaymentAmount;

  // Determine the redirect origin (use request origin or fall back to first configured origin)
  const redirectOrigin = origin || (Array.isArray(config.corsOrigin) ? config.corsOrigin[0] : config.corsOrigin);

  console.log('🎁 Gift Checkout - Redirect Origin Logic:');
  console.log('   - Received origin:', origin);
  console.log('   - Config CORS origins:', config.corsOrigin);
  console.log('   - Final redirect origin:', redirectOrigin);

  // Convert payment amount to cents for Stripe price_data
  // paymentAmount may be a float (e.g. 9.99) or already an integer cents value
  const unitAmountCents = paymentAmount >= 100
    ? Math.round(paymentAmount)              // already in cents (e.g. 999)
    : Math.round(paymentAmount * 100);       // convert euros to cents (e.g. 9.99 → 999)

  try {
    // Create Stripe Checkout Session for gift subscription
    // mode: 'payment' = one-time charge (no recurring "per year" label)
    // No payment_method_types = Stripe dynamically shows Card, Apple Pay, Google Pay
    // based on Dashboard settings + customer device/browser
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: gifter.email,
      client_reference_id: gifterId,
      line_items: [
        {
          price_data: {
            currency: config.paymentCurrency || 'eur',
            unit_amount: unitAmountCents,  // e.g. 999 for €9.99
            product_data: {
              name: '🎁 Gift Membership – Travel in a Click',
              description: '12-Month Annual Membership gifted by ' + gifter.firstName + ' ' + gifter.lastName,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${redirectOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}&gift=true`,
      cancel_url: `${redirectOrigin}/payment/cancel`,
      metadata: {
        gifterId: gifterId,
        gifterEmail: gifter.email,
        gifterFirstName: gifter.firstName,
        gifterLastName: gifter.lastName,
        recipientEmail: recipientEmail.toLowerCase(),
        recipientPassword: recipientPassword,
        recipientFirstName: recipientFirstName,
        recipientLastName: recipientLastName,
        isGift: 'true',
        planName: 'Annual Membership',
        amount: unitAmountCents.toString(),
      },
    });

    console.log('✅ Gift Checkout session created:', {
      sessionId: session.id,
      successUrl: `${redirectOrigin}/payment/success?session_id={CHECKOUT_SESSION_ID}&gift=true`,
      cancelUrl: `${redirectOrigin}/payment/cancel`,
    });

    return {
      sessionId: session.id,
      url: session.url,
      publishableKey: config.stripePublishableKey,
      amount: paymentAmount,
      currency: config.paymentCurrency,
      recipientEmail: recipientEmail,
    };
  } catch (error) {
    console.error('❌ Stripe gift checkout error:', error);
    throw new ApiError(500, 'Failed to create gift payment session');
  }
};

/**
 * Verify Gift Payment and Create Recipient Account
 */
export const verifyGiftPayment = async (sessionId) => {
  if (!sessionId) {
    throw new ApiError(400, 'Session ID is required');
  }

  try {
    // Retrieve session from Stripe (payment mode – no subscription to expand)
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer']
    });

    if (session.payment_status !== 'paid') {
      throw new ApiError(400, 'Payment not completed');
    }

    // Check if this is a gift subscription
    if (session.metadata.isGift !== 'true') {
      throw new ApiError(400, 'This is not a gift subscription session');
    }

    const {
      gifterId,
      gifterFirstName,
      gifterLastName,
      recipientEmail,
      recipientPassword,
      recipientFirstName,
      recipientLastName,
      amount: paidAmount,
    } = session.metadata;

    // Check if recipient account already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: recipientEmail },
    });

    if (existingUser) {
      throw new ApiError(400, 'Recipient account already exists');
    }

    // Hash the password
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(recipientPassword, 10);

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Gift uses one-time payment mode – no Stripe subscription ID
    // 12-month membership is tracked entirely in our own DB
    const stripePaymentIntentId = session.payment_intent || session.id;

    // Create recipient user, subscription, and payment records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create new user for recipient
      const newUser = await tx.user.create({
        data: {
          email: recipientEmail,
          password: hashedPassword,
          firstName: recipientFirstName,
          lastName: recipientLastName,
          fullName: `${recipientFirstName} ${recipientLastName}`,
          isEmailVerified: true, // No email verification needed for gifts
          status: 'ACTIVE', // Activate immediately
          role: 'USER',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          fullName: true,
          role: true,
          status: true,
          isEmailVerified: true,
          createdAt: true,
        },
      });

      // Create subscription for recipient
      const subscription = await tx.subscription.create({
        data: {
          userId: newUser.id,
          planName: 'Annual Membership',
          amount: parseFloat(paidAmount) / 100, // Convert cents to euros
          startDate: startDate,
          endDate: endDate,
          isActive: true,
          stripeSubId: stripePaymentIntentId,
          isGifted: true,
          giftedBy: gifterId,
        },
      });

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          userId: newUser.id,
          transactionId: stripePaymentIntentId,
          amount: parseFloat(paidAmount) / 100, // Convert cents to euros
          status: 'SUCCESS',
          paymentMethod: 'card',
        },
      });

      return { newUser, subscription, payment };
    });

    // Send gift notification email to recipient
    const { sendGiftSubscriptionEmail } = await import('./email.service.js');
    try {
      await sendGiftSubscriptionEmail(
        result.newUser.email,
        result.newUser.firstName,
        recipientPassword,
        `${gifterFirstName} ${gifterLastName}`
      );
    } catch (emailError) {
      console.error('Gift notification email error:', emailError);
    }

    return {
      message: 'Gift subscription successful! Recipient account has been created.',
      recipient: {
        email: result.newUser.email,
        firstName: result.newUser.firstName,
        lastName: result.newUser.lastName,
      },
      subscription: {
        planName: result.subscription.planName,
        amount: result.subscription.amount,
        startDate: result.subscription.startDate,
        endDate: result.subscription.endDate,
        isGifted: true,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('❌ Gift payment verification error:', error);
    throw new ApiError(500, 'Failed to verify gift payment');
  }
};