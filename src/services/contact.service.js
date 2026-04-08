import { ApiError } from '../utils/apiError.js';
import { sendContactFormEmail } from './email.service.js';

/**
 * Submit contact form
 */
export const submitContactForm = async (fullName, email, message) => {
  // Validation
  if (!fullName || !email || !message) {
    throw new ApiError(400, 'Full name, email, and message are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Invalid email format');
  }

  // Validate message length
  if (message.trim().length > 1000) {
    throw new ApiError(400, 'Message must not exceed 1000 characters');
  }

  console.log(`📧 Contact form submission from: ${email}`);

  // Send email to admin/support
  try {
    await sendContactFormEmail(fullName, email, message);
    console.log(`✅ Contact form email sent successfully`);
  } catch (error) {
    console.error('❌ Failed to send contact form email:', error);
    throw new ApiError(500, 'Failed to send contact form. Please try again later.');
  }

  return {
    message: 'Thank you for contacting us! We will get back to you soon.',
  };
};
