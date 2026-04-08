import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import config from '../config/index.js';

/**
 * Upload single image
 * @route POST /api/v1/upload/image
 * @access Private (requires authentication)
 */
export const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }

  // Create file URL (works both locally and on deployed server)
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  return res.status(200).json(
    ApiResponse.success('Image uploaded successfully', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
    })
  );
});

/**
 * Upload multiple images
 * @route POST /api/v1/upload/images
 * @access Private (requires authentication)
 */
export const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'No files uploaded');
  }

  // Create URLs for all uploaded files
  const filesData = req.files.map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
  }));

  return res.status(200).json(
    ApiResponse.success(`${req.files.length} image(s) uploaded successfully`, {
      count: req.files.length,
      files: filesData,
    })
  );
});

/**
 * Delete uploaded image
 * @route DELETE /api/v1/upload/image/:filename
 * @access Private (requires authentication)
 */
export const deleteImage = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  if (!filename) {
    throw new ApiError(400, 'Filename is required');
  }

  const fs = await import('fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.join(__dirname, '../../uploads', filename);

  try {
    // Check if file exists
    await fs.access(filePath);
    
    // Delete the file
    await fs.unlink(filePath);

    return res.status(200).json(
      ApiResponse.success('Image deleted successfully')
    );
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ApiError(404, 'Image not found');
    }
    throw new ApiError(500, 'Failed to delete image');
  }
});
