import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { paymentRouter } from './routes/payment.routes.js';
import { userRouter } from './routes/user.routes.js';
import { travelGuideRouter } from './routes/travelGuide.routes.js';
import { travelDealRouter } from './routes/travelDeal.routes.js';
import { contactRouter } from './routes/contact.routes.js';
import uploadRouter from './routes/upload.routes.js';
import giveawayRouter from './routes/giveaway.routes.js';
import settingsRouter from './routes/settings.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigin,
    
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Home route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the TravelInAClick API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});
// API routes
app.use('/api/v1/dashboard', dashboardRouter);

app.use('/api/v1/auth', authRouter);

app.use('/api/v1/payment', paymentRouter);

app.use('/api/v1/users', userRouter);

app.use('/api/v1/travel-guides', travelGuideRouter);

app.use('/api/v1/travel-deals', travelDealRouter);

app.use('/api/v1/upload', uploadRouter);

app.use('/api/v1/giveaways', giveawayRouter);

app.use('/api/v1/settings', settingsRouter);

app.use('/api/v1/contact', contactRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
