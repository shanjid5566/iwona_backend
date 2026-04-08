import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { authenticate, authenticateForPayment } from '../middlewares/auth.js';

const router = express.Router();

router.get('/config', paymentController.getPublishableKey);
router.post('/create-checkout-session', authenticateForPayment, paymentController.createCheckoutSession);
router.post('/verify', paymentController.verifyPayment);

// Gift subscription routes
router.post('/gift/create-checkout-session', authenticate, paymentController.createGiftCheckoutSession);
router.post('/gift/verify', paymentController.verifyGiftPayment);

export const paymentRouter = router;