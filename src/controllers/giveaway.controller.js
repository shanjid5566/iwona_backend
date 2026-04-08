import * as giveawayService from '../services/giveaway.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * @desc    Get all giveaways
 * @route   GET /api/v1/giveaways
 * @access  Admin
 */
export const getAllGiveaways = asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    search: req.query.search || '',
    status: req.query.status || '',
    sortBy: req.query.sortBy || 'createdAt',
    sortOrder: req.query.sortOrder || 'desc',
  };

  const result = await giveawayService.getAllGiveaways(options);

  res
    .status(200)
    .json(
      ApiResponse.success('Giveaways retrieved successfully', result)
    );
});

/**
 * @desc    Get giveaway by ID
 * @route   GET /api/v1/giveaways/:id
 * @access  Public
 */
export const getGiveawayById = asyncHandler(async (req, res) => {
  const giveaway = await giveawayService.getGiveawayById(req.params.id);

  res
    .status(200)
    .json(
      ApiResponse.success('Giveaway retrieved successfully', { giveaway })
    );
});

/**
 * @desc    Get currently active giveaway
 * @route   GET /api/v1/giveaways/active
 * @access  Public
 */
export const getActiveGiveaway = asyncHandler(async (req, res) => {
  const giveaway = await giveawayService.getActiveGiveaway();

  if (!giveaway) {
    res
      .status(200)
      .json(
        ApiResponse.success('No active giveaway at the moment', { giveaway: null })
      );
  } else {
    res
      .status(200)
      .json(
        ApiResponse.success('Active giveaway retrieved successfully', { giveaway })
      );
  }
});

/**
 * @desc    Create new giveaway
 * @route   POST /api/v1/giveaways
 * @access  Admin
 */
export const createGiveaway = asyncHandler(async (req, res) => {
  // Handle image upload
  let giveawayImage = null;
  if (req.file) {
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${
      req.file.filename
    }`;
    giveawayImage = imageUrl;
  }

  // Parse boolean field
  const isMonthlyActive =
    req.body.isMonthlyActive === 'true' ||
    req.body.isMonthlyActive === true;

  const giveawayData = {
    title: req.body.title,
    description: req.body.description,
    giveawayImage,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    isMonthlyActive,
  };

  const giveaway = await giveawayService.createGiveaway(giveawayData);

  res
    .status(201)
    .json(
      ApiResponse.success('Giveaway created successfully', { giveaway })
    );
});

/**
 * @desc    Update giveaway
 * @route   PUT /api/v1/giveaways/:id
 * @access  Admin
 */
export const updateGiveaway = asyncHandler(async (req, res) => {
  // Handle new image upload
  let giveawayImage = undefined;
  if (req.file) {
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${
      req.file.filename
    }`;
    giveawayImage = imageUrl;
  }

  // Parse boolean field if provided
  let isMonthlyActive = undefined;
  if (req.body.isMonthlyActive !== undefined) {
    isMonthlyActive =
      req.body.isMonthlyActive === 'true' ||
      req.body.isMonthlyActive === true;
  }

  const updateData = {
    ...req.body,
    giveawayImage,
    isMonthlyActive,
  };

  const giveaway = await giveawayService.updateGiveaway(
    req.params.id,
    updateData
  );

  res
    .status(200)
    .json(
      ApiResponse.success('Giveaway updated successfully', { giveaway })
    );
});

/**
 * @desc    Delete giveaway
 * @route   DELETE /api/v1/giveaways/:id
 * @access  Admin
 */
export const deleteGiveaway = asyncHandler(async (req, res) => {
  await giveawayService.deleteGiveaway(req.params.id);

  res
    .status(200)
    .json(ApiResponse.success('Giveaway deleted successfully'));
});

/**
 * @desc    Get all entries for a giveaway
 * @route   GET /api/v1/giveaways/:id/entries
 * @access  Admin
 */
export const getGiveawayEntries = asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50,
  };

  const result = await giveawayService.getGiveawayEntries(
    req.params.id,
    options
  );

  res
    .status(200)
    .json(
      ApiResponse.success('Giveaway entries retrieved successfully', result)
    );
});

/**
 * @desc    User enters a giveaway (participate)
 * @route   POST /api/v1/giveaways/:id/enter
 * @access  User (Authenticated)
 */
export const enterGiveaway = asyncHandler(async (req, res) => {
  const entry = await giveawayService.enterGiveaway(
    req.params.id,
    req.user.id
  );

  res
    .status(201)
    .json(
      ApiResponse.success('Successfully entered the giveaway', { 
        entry,
        hasEntered: true  // ← Frontend জানবে user already entered
      })
    );
});

/**
 * @desc    Check user's entry status for active giveaway
 * @route   GET /api/v1/giveaways/check-status
 * @access  User (Authenticated)
 */
export const checkGiveawayStatus = asyncHandler(async (req, res) => {
  console.log('🔍 checkGiveawayStatus called');
  console.log('📌 req.user:', req.user);
  
  const result = await giveawayService.checkUserGiveawayStatus(req.user.id);
  
  console.log('✅ Service result:', result);

  res
    .status(200)
    .json(
      ApiResponse.success('Giveaway status retrieved successfully', result)
    );
});
