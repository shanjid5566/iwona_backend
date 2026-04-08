import * as paymentService from '../services/payment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const createCheckoutSession = asyncHandler(async (req, res) => {
  console.log('💳 Create Checkout Session Request:', {
    userId: req.user.id,
    userEmail: req.user.email,
    userStatus: req.user.status,
    amount: req.body.amount
  });

  const { amount } = req.body; // Optional: frontend can send custom amount
  
  // Extract origin from request - prefer 'origin' header, fallback to referer
  let origin = req.get('origin');
  if (!origin && req.get('referer')) {
    try {
      const refererUrl = new URL(req.get('referer'));
      origin = `${refererUrl.protocol}//${refererUrl.host}`;
    } catch (e) {
      console.error('Error parsing referer:', e);
    }
  }
  
  console.log('🌐 Detected Origin:', origin);
  console.log('📋 Request Headers - Origin:', req.get('origin'));
  console.log('📋 Request Headers - Referer:', req.get('referer'));
  
  const result = await paymentService.createCheckoutSession(req.user.id, amount, origin);

  console.log('✅ Checkout session created:', {
    sessionId: result.sessionId,
    hasUrl: !!result.url
  });

  res.status(200).json(ApiResponse.success('Checkout session created', result));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const result = await paymentService.verifyPayment(sessionId);
  res.status(200).json(ApiResponse.success(result.message, result));
});

export const getPublishableKey = asyncHandler(async (req, res) => {
  const result = paymentService.getPublishableKey();
  res.status(200).json(ApiResponse.success('Key retrieved', result));
});

export const createGiftCheckoutSession = asyncHandler(async (req, res) => {
  const { recipientEmail, recipientPassword, recipientFirstName, recipientLastName, amount } = req.body;
  
  // Validate required fields
  if (!recipientEmail || !recipientPassword || !recipientFirstName || !recipientLastName) {
    res.status(400).json(ApiResponse.error('All recipient details are required'));
    return;
  }
  
  // Extract origin from request - prefer 'origin' header, fallback to referer
  let origin = req.get('origin');
  if (!origin && req.get('referer')) {
    try {
      const refererUrl = new URL(req.get('referer'));
      origin = `${refererUrl.protocol}//${refererUrl.host}`;
    } catch (e) {
      console.error('Error parsing referer:', e);
    }
  }
  
  console.log('🎁 Gift Checkout Request - Detected Origin:', origin);
  console.log('📋 Request Headers - Origin:', req.get('origin'));
  console.log('📋 Request Headers - Referer:', req.get('referer'));
  
  const result = await paymentService.createGiftCheckoutSession(
    req.user.id,
    recipientEmail,
    recipientPassword,
    recipientFirstName,
    recipientLastName,
    amount,
    origin
  );
  
  res.status(200).json(ApiResponse.success('Gift checkout session created', result));
});

export const verifyGiftPayment = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const result = await paymentService.verifyGiftPayment(sessionId);
  res.status(200).json(ApiResponse.success(result.message, result));
});
