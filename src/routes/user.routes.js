import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All routes below require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', userController.getMe);

/**
 * @route   PUT /api/v1/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', userController.updateMe);

/**
 * @route   PUT /api/v1/users/me/home-airport
 * @desc    Update user home airport
 * @access  Private
 */
router.put('/me/home-airport', userController.updateHomeAirport);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
router.get('/', authorize('ADMIN'), userController.getAllUsers);

/**
 * @route   GET /api/v1/users/export/pdf
 * @desc    Export all members as PDF (Admin only)
 * @access  Private/Admin
 */
router.get('/export/pdf', authorize('ADMIN'), userController.exportMembersPdf);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID (Admin only)
 * @access  Private/Admin
 */
router.get('/:id', authorize('ADMIN'), userController.getUserById);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user by ID (Admin only)
 * @access  Private/Admin
 */
router.put('/:id', authorize('ADMIN'), userController.updateUserById);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user by ID (Admin only)
 * @access  Private/Admin
 */
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

export { router as userRouter };
