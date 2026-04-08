import * as settingsService from '../services/settings.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * @desc    Get website settings
 * @route   GET /api/v1/settings
 * @access  Admin
 */
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();

  res
    .status(200)
    .json(ApiResponse.success('Settings retrieved successfully', { settings }));
});

/**
 * @desc    Update website settings
 * @route   PUT /api/v1/settings
 * @access  Admin
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body);

  res
    .status(200)
    .json(ApiResponse.success('Settings updated successfully', { settings }));
});
