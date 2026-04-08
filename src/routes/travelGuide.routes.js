import express from 'express';
import * as travelGuideController from '../controllers/travelGuide.controller.js';
import { authenticate, authorize, isUser } from '../middlewares/auth.js';
import upload from '../config/multer.js';

const router = express.Router();

// ========================================
// PUBLIC ROUTES (No Authentication Required)
// ========================================

/**
 * @route   GET /api/v1/travel-guides/top
 * @desc    Get top 3 travel guides (no login required)
 * @access  Public
 */
router.get('/top', travelGuideController.getTopGuides);

// ========================================
// USER ROUTES (Authenticated Users)
// ========================================

/**
 * @route   GET /api/v1/travel-guides
 * @desc    Get all travel guides (accessible to all logged in users)
 * @access  Private/User
 */
router.get('/', authenticate, isUser, travelGuideController.getAllGuides);

/**
 * @route   GET /api/v1/travel-guides/:id
 * @desc    Get travel guide by ID (accessible to all logged in users)
 * @access  Private/User
 */
router.get('/:id', authenticate, isUser, travelGuideController.getGuideById);

// ========================================
// ADMIN ROUTES (Authentication Required)
// ========================================

/**
 * @route   POST /api/v1/travel-guides
 * @desc    Create new travel guide (supports image upload)
 * @access  Private/Admin
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  upload.single('heroImage'),
  travelGuideController.createGuide
);

/**
 * @route   PUT /api/v1/travel-guides/:id
 * @desc    Update travel guide (supports image upload)
 * @access  Private/Admin
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  upload.single('heroImage'),
  travelGuideController.updateGuide
);

/**
 * @route   DELETE /api/v1/travel-guides/:id
 * @desc    Delete travel guide
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, authorize('ADMIN'), travelGuideController.deleteGuide);

export { router as travelGuideRouter };
