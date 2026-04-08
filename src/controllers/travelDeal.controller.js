import * as travelDealService from '../services/travelDeal.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Get featured travel deals (Public)
 * @route GET /api/v1/travel-deals/featured
 * @access Public (No auth required)
 */
export const getFeaturedDeals = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder } = req.query;

  const result = await travelDealService.getAllDeals({
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    isFeatured: true,
    sortBy,
    sortOrder,
  });

  res.status(200).json(
    ApiResponse.success('Featured travel deals retrieved successfully', result)
  );
});

/**
 * Get all travel deals
 * @route GET /api/v1/travel-deals
 * @access Private/Admin
 */
export const getAllDeals = asyncHandler(async (req, res) => {
  const { page, limit, search, status, isFeatured, airport, sortBy, sortOrder } = req.query;

  const result = await travelDealService.getAllDeals({
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
    search,
    status,
    isFeatured,
    airport,
    sortBy,
    sortOrder,
  });

  res.status(200).json(
    ApiResponse.success('Travel deals retrieved successfully', result)
  );
});

/**
 * Get travel deal by ID
 * @route GET /api/v1/travel-deals/:id
 * @access Private/Admin
 */
export const getDealById = asyncHandler(async (req, res) => {
  const deal = await travelDealService.getDealById(req.params.id);

  res.status(200).json(
    ApiResponse.success('Travel deal retrieved successfully', { deal })
  );
});

/**
 * Create new travel deal
 * Supports multipart/form-data for image upload
 * @route POST /api/v1/travel-deals
 * @access Private/Admin
 */
export const createDeal = asyncHandler(async (req, res) => {
  // Parse request body (handle both JSON and form-data)
  const data = { ...req.body };

  // Convert string booleans to actual booleans
  if (typeof data.isFeatured === 'string') {
    data.isFeatured = data.isFeatured === 'true';
  }

  // If image file is uploaded, generate URL
  if (req.file) {
    data.dealImage = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  const deal = await travelDealService.createDeal(data);

  res.status(201).json(
    ApiResponse.success('Travel deal created successfully', { deal })
  );
});

/**
 * Update travel deal
 * Supports multipart/form-data for image upload
 * @route PUT /api/v1/travel-deals/:id
 * @access Private/Admin
 */
export const updateDeal = asyncHandler(async (req, res) => {
  // Parse request body (handle both JSON and form-data)
  const data = { ...req.body };

  // Convert string booleans to actual booleans
  if (typeof data.isFeatured === 'string') {
    data.isFeatured = data.isFeatured === 'true';
  }

  // If new image file is uploaded, generate URL
  if (req.file) {
    data.dealImage = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  const deal = await travelDealService.updateDeal(req.params.id, data);

  res.status(200).json(
    ApiResponse.success('Travel deal updated successfully', { deal })
  );
});

/**
 * Delete travel deal
 * @route DELETE /api/v1/travel-deals/:id
 * @access Private/Admin
 */
export const deleteDeal = asyncHandler(async (req, res) => {
  await travelDealService.deleteDeal(req.params.id);

  res.status(200).json(
    ApiResponse.success('Travel deal deleted successfully')
  );
});

/**
 * Update deal status
 * @route PATCH /api/v1/travel-deals/:id/status
 * @access Private/Admin
 */
export const updateDealStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    throw new ApiError(400, 'Status is required');
  }

  const deal = await travelDealService.updateDealStatus(req.params.id, status);

  res.status(200).json(
    ApiResponse.success('Deal status updated successfully', { deal })
  );
});

/**
 * Toggle featured status
 * @route PATCH /api/v1/travel-deals/:id/featured
 * @access Private/Admin
 */
export const toggleFeatured = asyncHandler(async (req, res) => {
  const deal = await travelDealService.toggleFeatured(req.params.id);

  res.status(200).json(
    ApiResponse.success('Featured status toggled successfully', { deal })
  );
});
