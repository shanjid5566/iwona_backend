-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
