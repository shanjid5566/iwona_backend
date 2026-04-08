import { asyncHandler } from '../utils/asyncHandler.js';
import * as contactService from '../services/contact.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Submit contact form
 */
export const submitContactForm = asyncHandler(async (req, res) => {
  const { fullName, email, message } = req.body;
  
  const result = await contactService.submitContactForm(fullName, email, message);
  
  res.status(200).json(
    ApiResponse.success(result.message)
  );
});
