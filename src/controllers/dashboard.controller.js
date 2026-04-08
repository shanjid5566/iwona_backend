import * as dashboardService from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/dashboard
 * @access  Admin
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getDashboardStats();

  res
    .status(200)
    .json(
      ApiResponse.success('Dashboard statistics retrieved successfully', stats)
    );
});
