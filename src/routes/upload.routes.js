import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import upload from '../config/multer.js';
import {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
} from '../controllers/upload.controller.js';

const router = express.Router();

/**
 * @route   POST /api/v1/upload/image
 * @desc    Upload single image
 * @access  Private
 */
router.post('/image', authenticate, upload.single('image'), uploadSingleImage);

/**
 * @route   POST /api/v1/upload/images
 * @desc    Upload multiple images (max 10)
 * @access  Private
 */
router.post('/images', authenticate, upload.array('images', 10), uploadMultipleImages);

/**
 * @route   DELETE /api/v1/upload/image/:filename
 * @desc    Delete uploaded image
 * @access  Private
 */
router.delete('/image/:filename', authenticate, deleteImage);

export default router;
