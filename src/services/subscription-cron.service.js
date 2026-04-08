/**
 * Subscription Expiry Cron Service
 * ─────────────────────────────────────────────────────────
 * Runs once a day and checks for gift subscriptions whose
 * endDate falls within the next 29–32 days (i.e. ~1 month away).
 * For each matching subscription it sends one reminder email to
 * the recipient and marks the record so it is never sent twice.
 */

import cron from 'node-cron';
import prisma from '../config/database.js';
import config from '../config/index.js';
import { sendGiftExpiryReminderEmail } from './email.service.js';

/**
 * Check and send expiry reminders for gift subscriptions
 * expiring in approximately 1 month (29–32 days).
 */
export const checkGiftSubscriptionExpiry = async () => {
  console.log('⏰ [Cron] Checking gift subscriptions expiring in ~1 month…');

  try {
    const now = new Date();

    // Window: subscriptions expiring between 29 and 32 days from now
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() + 29);

    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + 32);

    // Find active gifted subscriptions that:
    //  • have NOT had a reminder sent yet
    //  • expire within the 29–32 day window
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        isGifted: true,
        isActive: true,
        reminderSent: false,
        endDate: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    });

    if (expiringSubscriptions.length === 0) {
      console.log('✅ [Cron] No gift subscriptions expiring in the next ~1 month.');
      return;
    }

    console.log(
      `📬 [Cron] Found ${expiringSubscriptions.length} gift subscription(s) expiring soon. Sending reminders…`
    );

    const renewalUrl = `${config.corsOrigin}/payment`;

    for (const subscription of expiringSubscriptions) {
      const { user, endDate, id: subscriptionId } = subscription;

      try {
        // Send the reminder email
        await sendGiftExpiryReminderEmail(
          user.email,
          user.firstName,
          endDate,
          renewalUrl
        );

        // Mark the reminder as sent so we never send it again
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            reminderSent: true,
            reminderSentAt: new Date(),
          },
        });

        console.log(`✅ [Cron] Reminder sent to ${user.email} (subscription ${subscriptionId})`);
      } catch (err) {
        // Log per-user errors but continue processing others
        console.error(
          `❌ [Cron] Failed to send reminder to ${user.email} (subscription ${subscriptionId}):`,
          err.message
        );
      }
    }

    console.log('✅ [Cron] Gift subscription expiry check complete.');
  } catch (err) {
    console.error('❌ [Cron] Gift subscription expiry check failed:', err.message);
  }
};

/**
 * Mark subscriptions as expired when their endDate has passed.
 * Updates both subscription and user status to revoke access.
 * Runs daily to ensure expired subscriptions are identified automatically.
 */
export const markExpiredSubscriptions = async () => {
  console.log('⏰ [Cron] Checking for expired subscriptions…');

  try {
    const now = new Date();

    // Find all active subscriptions that have passed their endDate
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        isActive: true,
        isExpired: false,
        endDate: { lt: now },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    });

    if (expiredSubscriptions.length === 0) {
      console.log('✅ [Cron] No expired subscriptions found.');
      return;
    }

    console.log(
      `🔄 [Cron] Found ${expiredSubscriptions.length} expired subscription(s). Marking as expired…`
    );

    for (const subscription of expiredSubscriptions) {
      try {
        // Mark subscription as expired and inactive
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            isActive: false,
            isExpired: true,
          },
        });

        // Update user status to INACTIVE
        await prisma.user.update({
          where: { id: subscription.userId },
          data: { status: 'INACTIVE' },
        });

        console.log(
          `✅ [Cron] Subscription ${subscription.id} marked as expired for user ${subscription.user.email}`
        );
      } catch (err) {
        console.error(
          `❌ [Cron] Failed to expire subscription ${subscription.id}:`,
          err.message
        );
      }
    }

    console.log('✅ [Cron] Expired subscriptions processing complete.');
  } catch (err) {
    console.error('❌ [Cron] Failed to mark expired subscriptions:', err.message);
  }
};

/**
 * Start All Subscription Cron Jobs
 *
 * Schedule: every day at 08:00 AM server time
 */
export const startSubscriptionCronJobs = () => {
  // Run once daily at 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('\n────────────────────────────────────');
    console.log('⏰ [Cron] Daily subscription check running…');
    console.log('────────────────────────────────────');
    await checkGiftSubscriptionExpiry();
    await markExpiredSubscriptions();
  });

  console.log('✅ Subscription cron jobs scheduled (daily at 08:00).');
};
