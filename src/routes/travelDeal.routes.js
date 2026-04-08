import express from 'express';
import * as travelDealController from '../controllers/travelDeal.controller.js';
import { authenticate, authorize, isUser } from '../middlewares/auth.js';
import upload from '../config/multer.js';

const router = express.Router();

// Middleware to handle file uploads with flexible field names
const handleDealImageUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        statusCode: 400,
        message: 'File upload error',
        error: err.message,
      });
    }
    
    // Move uploaded file to req.file for compatibility
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    
    next();
  });
};

// ========================================
// PUBLIC ROUTES (No Authentication Required)
// ========================================

/**
 * @route   GET /api/v1/travel-deals/featured
 * @desc    Get featured travel deals (no login required)
 * @access  Public
 */
router.get('/featured', travelDealController.getFeaturedDeals);

// ========================================
// USER ROUTES (Authenticated Users)
// ========================================

/**
 * @route   GET /api/v1/travel-deals
 * @desc    Get all travel deals (accessible to all logged in users)
 * @access  Private/User
 */
router.get('/', authenticate, isUser, travelDealController.getAllDeals);

/**
 * @route   GET /api/v1/travel-deals/:id
 * @desc    Get travel deal by ID (accessible to all logged in users)
 * @access  Private/User
 */
router.get('/:id', authenticate, isUser, travelDealController.getDealById);

// ========================================
// ADMIN ROUTES (Authentication Required)
// ========================================

/**
 * @route   POST /api/v1/travel-deals
 * @desc    Create new travel deal (supports image upload)
 * @access  Private/Admin
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  handleDealImageUpload,
  travelDealController.createDeal
);

/**
 * @route   PUT /api/v1/travel-deals/:id
 * @desc    Update travel deal (supports image upload)
 * @access  Private/Admin
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  handleDealImageUpload,
  travelDealController.updateDeal
);

/**
 * @route   DELETE /api/v1/travel-deals/:id
 * @desc    Delete travel deal
 * @access  Private/Admin
 */
router.delete('/:id', authenticate, authorize('ADMIN'), travelDealController.deleteDeal);

/**
 * @route   PATCH /api/v1/travel-deals/:id/status
 * @desc    Update deal status (ACTIVE/EXPIRED)
 * @access  Private/Admin
 */
router.patch('/:id/status', authenticate, authorize('ADMIN'), travelDealController.updateDealStatus);

/**
 * @route   PATCH /api/v1/travel-deals/:id/featured
 * @desc    Toggle featured status
 * @access  Private/Admin
 */
router.patch('/:id/featured', authenticate, authorize('ADMIN'), travelDealController.toggleFeatured);

export { router as travelDealRouter };
