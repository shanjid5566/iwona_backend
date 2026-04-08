import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const router = express.Router();

router.post('/register', authController.register);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);

router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Password reset routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-otp', authController.verifyResetOTP);
router.post('/reset-password', authController.resetPassword);

export const authRouter = router;
