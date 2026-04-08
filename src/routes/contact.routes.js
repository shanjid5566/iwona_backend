import express from 'express';
import * as contactController from '../controllers/contact.controller.js';

const router = express.Router();

// Public route - no authentication required
router.post('/submit', contactController.submitContactForm);

export const contactRouter = router;
