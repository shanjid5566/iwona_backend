import express from 'express';
import * as giveawayController from '../controllers/giveaway.controller.js';
import { authenticate, authorize, isUser } from '../middlewares/auth.js';
import upload from '../config/multer.js';

const router = express.Router();

// ========================================
// PUBLIC ROUTES (No Authentication Required)
// ========================================

/**
 * @route   GET /api/v1/giveaways/public/active
 * @desc    Get active giveaway for homepage (public - no auth required)
 * @access  Public (Both logged-in and logged-out users)
 */
router.get('/public/active', giveawayController.getActiveGiveaway);

// ========================================
// USER ROUTES (Authenticated Users)
// ========================================

/**
 * @route   GET /api/v1/giveaways/check-status
 * @desc    Check user's entry status for active giveaway
 * @access  Private/User
 */
router.get('/check-status', authenticate, isUser, giveawayController.checkGiveawayStatus);

/**
 * @route   GET /api/v1/giveaways/active
 * @desc    Get active giveaway(s) for users to view
 * @access  Private/User
 */
router.get('/active', authenticate, isUser, giveawayController.getActiveGiveaway);

/**
 * @route   GET /api/v1/giveaways/:id
 * @desc    Get giveaway by ID (user view)
 * @access  Private/User
 */
router.get('/:id', authenticate, isUser, giveawayController.getGiveawayById);

/**
 * @route   POST /api/v1/giveaways/:id/enter
 * @desc    User enters a giveaway (accessible to all logged in users)
 * @access  User (Authenticated)
 */
router.post('/:id/enter', authenticate, giveawayController.enterGiveaway);

// ========================================
// ADMIN ROUTES (Admin Authorization Required)
// ========================================

/**
 * @route   GET /api/v1/giveaways
 * @desc    Get all giveaways with pagination and filters
 * @access  Admin
 */
router.get('/', authenticate, authorize('ADMIN'), giveawayController.getAllGiveaways);

/**
 * @route   GET /api/v1/giveaways/:id/entries
 * @desc    Get all entries for a giveaway
 * @access  Admin
 */
router.get('/:id/entries', authenticate, authorize('ADMIN'), giveawayController.getGiveawayEntries);

/**
 * @route   POST /api/v1/giveaways
 * @desc    Create new giveaway with image upload
 * @access  Admin
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  upload.single('giveawayImage'),
  giveawayController.createGiveaway
);

/**
 * @route   PUT /api/v1/giveaways/:id
 * @desc    Update giveaway with optional image upload
 * @access  Admin
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  upload.single('giveawayImage'),
  giveawayController.updateGiveaway
);

/**
 * @route   DELETE /api/v1/giveaways/:id
 * @desc    Delete giveaway
 * @access  Admin
 */
router.delete('/:id', authenticate, authorize('ADMIN'), giveawayController.deleteGiveaway);

export default router;

