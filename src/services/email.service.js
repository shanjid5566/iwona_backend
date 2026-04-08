// ============================================
// EMAIL SERVICE
// ============================================
// Currently using: SMTP (via nodemailer with Gmail)

// SMTP Configuration (Active)
import nodemailer from 'nodemailer';

import config from '../config/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// SMTP Setup (Active) 
// ============================================
const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpSecure, // true for 465, false for other ports
  auth: {
    user: config.smtpUser,
    pass: config.smtpPassword,
  },
});

// Verify SMTP connection on startup
transporter.verify()
  .then(() => {
    console.log('✅ SMTP server is ready to send emails');
    console.log(`📧 Using: ${config.smtpUser}`);
  })
  .catch((error) => {
    console.error('❌ SMTP connection error:', error.message);
  });

/**
 * Load and process email template
 */
const loadTemplate = (templateName, variables) => {
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace all variables in template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, value);
  }
  
  return html;
};

/**
 * Generate 4-digit OTP code
 */
export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Send OTP verification email using SMTP
 */
export const sendOTPEmail = async (email, code, firstName) => {
  const html = loadTemplate('otp-verification', {
    firstName,
    code
  });

  const textContent = `
Hi ${firstName}!

Welcome to Travel in a Click!

Your verification code is: ${code}

This code will expire in 10 minutes.

After verification, complete your payment of €9.99/year to unlock exclusive benefits.

Happy travels!
The Travel in a Click Team
  `.trim();

  try {
    console.log(`📨 Sending email via SMTP to: ${email}`);
    console.log(`📤 From: ${config.emailFrom}`);
    
    const info = await transporter.sendMail({
      from: `"Travel in a Click" <${config.emailFrom}>`,
      to: email,
      subject: '🔐 Your Verification Code',
      text: textContent,
      html: html,
    });

    console.log('✅ SMTP email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ SMTP error details:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send welcome email after payment success
 */
export const sendWelcomeEmail = async (email, firstName) => {
  const html = loadTemplate('welcome', {
    firstName,
    dashboardUrl: `${config.corsOrigin}/dashboard`
  });

  try {
    await transporter.sendMail({
      from: `"Travel in a Click" <${config.emailFrom}>`,
      to: email,
      subject: '🎉 Welcome to Travel in a Click!',
      html: html,
    });
    console.log('✅ Welcome email sent successfully');
  } catch (error) {
    console.error('❌ Welcome email error:', error.message);
  }
};

/**
 * Send gift subscription notification email to recipient
 */
export const sendGiftSubscriptionEmail = async (email, firstName, password, gifterName) => {
  // Use provided gifter name (fallback to default if not provided)
  const displayGifterName = gifterName || 'someone special';

  const html = loadTemplate('gift-subscription', {
    firstName,
    gifterName: displayGifterName,
    email,
    password,
    loginUrl: `${config.corsOrigin}/login`
  });

  const textContent = `
Hi ${firstName}!

🎁 You've received a gift! ${displayGifterName} has gifted you a 1-Year Annual Membership to Travel in a Click!

Your Login Credentials:
Email: ${email}
Password: ${password}

🔒 Security Tip: We recommend changing your password after logging in for the first time.

Your Exclusive Benefits:
✈️ Exclusive Travel Deals - Save up to 70% on flights, hotels, and experiences
🗺️ Premium Travel Guides - Expert destination guides at your fingertips
🎁 Monthly Giveaways - Win amazing travel prizes every month
💬 Priority Support - Get instant help whenever you need it

Login here: ${config.corsOrigin}/login

Happy travels and enjoy your gift!
The Travel in a Click Team
  `.trim();

  try {
    console.log(`📨 Sending gift subscription email to: ${email}`);
    const info = await transporter.sendMail({
      from: `"Travel in a Click" <${config.emailFrom}>`,
      to: email,
      subject: '🎁 You\'ve Received a Gift Subscription!',
      text: textContent,
      html: html,
    });
    console.log('✅ Gift subscription email sent successfully');
    return info;
  } catch (error) {
    console.error('❌ Gift subscription email error:', error.message);
    throw new Error(`Failed to send gift subscription email: ${error.message}`);
  }
};

/**
 * Send gift subscription expiry reminder email (sent ~1 month before expiry)
 */
export const sendGiftExpiryReminderEmail = async (email, firstName, expiryDate, renewalUrl) => {
  const formattedExpiry = new Date(expiryDate).toLocaleDateString('en-IE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = loadTemplate('gift-expiry-reminder', {
    firstName,
    expiryDate: formattedExpiry,
    renewalUrl: renewalUrl || `${config.corsOrigin}/payment`,
    loginUrl: `${config.corsOrigin}/login`,
  });

  const textContent = `
Hi ${firstName},

Your gift subscription to Travel in a Click is expiring on ${formattedExpiry} — that's just 1 month away!

We'd hate for you to miss out on exclusive travel deals, premium guides, and monthly giveaways.

Renew your subscription here: ${renewalUrl || `${config.corsOrigin}/payment`}

Annual Membership: €9.99/year

Thank you for being part of Travel in a Click!
The Travel in a Click Team
  `.trim();

  try {
    console.log(`📨 Sending gift expiry reminder email to: ${email}`);
    const info = await transporter.sendMail({
      from: `"Travel in a Click" <${config.emailFrom}>`,
      to: email,
      subject: '⏰ Your Gift Subscription Expires in 1 Month – Renew Today!',
      text: textContent,
      html: html,
    });
    console.log('✅ Gift expiry reminder email sent successfully');
    return info;
  } catch (error) {
    console.error('❌ Gift expiry reminder email error:', error.message);
    throw new Error(`Failed to send gift expiry reminder email: ${error.message}`);
  }
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const html = loadTemplate('password-reset', {
    firstName,
    resetToken
  });

  const textContent = `
Hi ${firstName}!

We received a request to reset your Travel in a Click account password.

Your password reset code is: ${resetToken}

⏰ This code will expire in 10 minutes.

🔒 Security Notice:
If you didn't request a password reset, please ignore this email or contact support if you have concerns.

Stay secure!
The Travel in a Click Team
  `.trim();

  try {
    console.log(`📨 Sending password reset email to: ${email}`);
    const info = await transporter.sendMail({
      from: `"Travel in a Click" <${config.emailFrom}>`,
      to: email,
      subject: '🔐 Reset Your Password',
      text: textContent,
      html: html,
    });
    console.log('✅ Password reset email sent successfully');
    return info;
  } catch (error) {
    console.error('❌ Password reset email error:', error.message);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

/**
 * Send contact form submission email to admin
 */
export const sendContactFormEmail = async (fullName, userEmail, message) => {
  const timestamp = new Date().toLocaleString('en-US', { 
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = loadTemplate('contact-form', {
    fullName,
    userEmail,
    message,
    timestamp
  });

  const textContent = `
NEW CONTACT FORM SUBMISSION

From: ${fullName}
Email: ${userEmail}
Submitted: ${new Date().toLocaleString()}

MESSAGE:
${message}

---
Reply to this email to respond to ${fullName}.
Travel in a Click - Contact Form Notification
  `.trim();

  try {
    console.log(`📨 Sending contact form notification to admin`);
    const info = await transporter.sendMail({
      from: `"Travel in a Click - Contact Form" <${config.emailFrom}>`,
      to: 'info@travelinaclick.ie',
      replyTo: userEmail, // User can reply directly to sender
      subject: `📬 New Contact Form Submission from ${fullName}`,
      text: textContent,
      html: html,
    });
    console.log('✅ Contact form email sent successfully');
    return info;
  } catch (error) {
    console.error('❌ Contact form email error:', error.message);
    throw new Error(`Failed to send contact form email: ${error.message}`);
  }
};
