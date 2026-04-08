import express from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * @route   GET /api/v1/dashboard
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get('/', dashboardController.getDashboardStats);

export default router;
