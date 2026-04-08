import express from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('ADMIN'));

/**
 * @route   GET /api/v1/settings
 * @desc    Get website settings
 * @access  Admin
 */
router.get('/', settingsController.getSettings);

/**
 * @route   PUT /api/v1/settings
 * @desc    Update website settings
 * @access  Admin
 */
router.put('/', settingsController.updateSettings);

export default router;
