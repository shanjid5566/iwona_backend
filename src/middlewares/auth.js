import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import prisma from '../config/database.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Basic authentication - allows ACTIVE and INACTIVE users
 * Use this for routes that don't require active subscription
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer')) {
    throw new ApiError(401, 'Unauthorized: No token provided');
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        subscriptions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new ApiError(401, 'Unauthorized: User not found');
    }

    // Allow both ACTIVE and INACTIVE users (expired users can login and browse)
    // Only PENDING users need email verification first
    if (user.status !== 'ACTIVE' && user.status !== 'INACTIVE') {
      throw new ApiError(403, 'Forbidden: User account is not active');
    }

    req.user = user; // Attach user to request object
    req.subscription = user.subscriptions[0] || null; // Attach latest subscription (may be expired)
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(401, 'Unauthorized: Invalid token');
  }
});

/**
 * Subscription check middleware - use AFTER authenticate
 * Requires user to have an active, non-expired subscription
 * Use this for premium/dashboard routes only
 */
const requireSubscription = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized: Authentication required');
  }

  // Get active subscription
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId: req.user.id,
      isActive: true,
      isExpired: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!activeSubscription) {
    throw new ApiError(403, 'Forbidden: No active subscription found. Please renew your subscription to access this content.');
  }

  // Additional check: verify subscription hasn't expired (in case cron hasn't run yet)
  const now = new Date();
  if (activeSubscription.endDate < now) {
    throw new ApiError(403, 'Forbidden: Your subscription has expired. Please renew to continue accessing premium content.');
  }

  req.activeSubscription = activeSubscription; // Attach active subscription
  next();
});

/**
 * Authentication middleware for payment endpoints
 * Allows PENDING (email verified, payment incomplete), ACTIVE, and INACTIVE (expired) users
 * This enables users with expired subscriptions to renew
 */
const authenticateForPayment = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  console.log('🔐 Payment Auth - Headers:', {
    hasAuth: !!authHeader,
    authHeader: authHeader ? authHeader.substring(0, 20) + '...' : 'none'
  });

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    throw new ApiError(401, 'Unauthorized: No token provided');
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    console.log('✅ Token decoded:', { userId: decoded.userId });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      console.log('❌ User not found:', decoded.userId);
      throw new ApiError(401, 'Unauthorized: User not found');
    }

    console.log('👤 User found:', { 
      email: user.email, 
      status: user.status, 
      isEmailVerified: user.isEmailVerified 
    });

    // For payment endpoints, allow PENDING, ACTIVE, and INACTIVE users
    // INACTIVE users can renew their expired subscriptions
    if (!['ACTIVE', 'PENDING', 'INACTIVE'].includes(user.status)) {
      throw new ApiError(403, 'Forbidden: User account status not valid for payment');
    }

    // Ensure email is verified before allowing payment
    if (!user.isEmailVerified) {
      throw new ApiError(403, 'Forbidden: Please verify your email first');
    }

    req.user = user; // Attach user to request object
    console.log('✅ Authentication successful for payment');
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.log('❌ Token verification failed:', err.message);
    throw new ApiError(401, 'Unauthorized: Invalid token');
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized: No user authenticated');
    }
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Forbidden: Insufficient permissions');
    }
    next();
  };
};
const isAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Unauthorized: No user authenticated');
  }
  if (req.user.role !== 'Admin') {
    throw new ApiError(403, 'Forbidden: Insufficient permissions');
  }
  next();
});
const isUser = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  // Both USER and ADMIN can access
  if (!['USER', 'ADMIN'].includes(req.user.role)) {
    throw new ApiError(403, 'User access required');
  }

  next();
});
export { authenticate, requireSubscription, authenticateForPayment, authorize, isAdmin, isUser };
