import * as travelGuideService from '../services/travelGuide.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Get top travel guides (Public)
 * @route GET /api/v1/travel-guides/top
 * @access Public (No auth required)
 */
const getTopGuides = asyncHandler(async (req, res) => {
  const result = await travelGuideService.getAllGuides({
    page: 1,
    limit: 3,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  res.status(200).json(
    ApiResponse.success('Top travel guides retrieved successfully', { guides: result.guides })
  );
});

/**
 * Get all travel guides
 */
const getAllGuides = asyncHandler(async (req, res) => {
  const { page, limit, search, category, sortBy, sortOrder } = req.query;

  const result = await travelGuideService.getAllGuides({
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    search,
    category,
    sortBy,
    sortOrder,
  });

  res.status(200).json(
    ApiResponse.success('Travel guides retrieved successfully', result)
  );
});

/**
 * Get travel guide by ID
 */
const getGuideById = asyncHandler(async (req, res) => {
  const guide = await travelGuideService.getGuideById(req.params.id);

  res.status(200).json(
    ApiResponse.success('Travel guide retrieved successfully', { guide })
  );
});

/**
 * Create new travel guide
 * Supports multipart/form-data for image upload
 */
const createGuide = asyncHandler(async (req, res) => {
  // Parse request body (handle both JSON and form-data)
  const data = { ...req.body };
  
  // Parse content if it's a string (from form-data)
  if (typeof data.content === 'string') {
    data.content = JSON.parse(data.content);
  }
  
  // If image file is uploaded, generate URL
  if (req.file) {
    data.heroImage = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }
  
  const guide = await travelGuideService.createGuide(data);

  res.status(201).json(
    ApiResponse.success('Travel guide created successfully', { guide })
  );
});

/**
 * Update travel guide
 * Supports multipart/form-data for image upload
 */
const updateGuide = asyncHandler(async (req, res) => {
  // Parse request body (handle both JSON and form-data)
  const data = { ...req.body };
  
  // Parse content if it's a string (from form-data)
  if (typeof data.content === 'string') {
    data.content = JSON.parse(data.content);
  }
  
  // If new image file is uploaded, generate URL
  if (req.file) {
    data.heroImage = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }
  
  const guide = await travelGuideService.updateGuide(req.params.id, data);

  res.status(200).json(
    ApiResponse.success('Travel guide updated successfully', { guide })
  );
});

/**
 * Delete travel guide
 */
const deleteGuide = asyncHandler(async (req, res) => {
  await travelGuideService.deleteGuide(req.params.id);

  res.status(200).json(
    ApiResponse.success('Travel guide deleted successfully')
  );
});

export { getTopGuides, getAllGuides, getGuideById, createGuide, updateGuide, deleteGuide };
