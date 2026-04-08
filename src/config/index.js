import 'dotenv/config';

const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // CORS & Frontend (hardcoded portfolio frontend URL)
  corsOrigin: ['https://iwona-frontend.vercel.app'],

  // Pagination defaults
  defaultPageSize: 10,
  maxPageSize: 100,
  
  // ============================================
  // EMAIL CONFIGURATION
  // ============================================
  
  // SMTP Configuration (Active)
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true' || false, // true for 465, false for other ports
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  emailFrom: process.env.EMAIL_FROM || 'noreply@travelinaclick.com',
  
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripePriceId: process.env.STRIPE_PRICE_ID,

  // Payment
  defaultPaymentAmount: parseFloat(process.env.DEFAULT_PAYMENT_AMOUNT) || 9.99,
  paymentCurrency: process.env.PAYMENT_CURRENCY || 'eur',
};

// Validation
const requiredEnvVars = [
  'DATABASE_URL', 
  'SMTP_USER',
  'SMTP_PASSWORD',
  'EMAIL_FROM', 
  'STRIPE_SECRET_KEY', 
  'STRIPE_PUBLISHABLE_KEY'
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export default config;
