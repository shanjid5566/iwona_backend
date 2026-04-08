/*
  Warnings:

  - Added the required column `updatedAt` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Subscription_userId_key";

-- AlterTable
ALTER TABLE "Subscription" 
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "isExpired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isRenewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "renewedSubscriptionId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_isActive_endDate_idx" ON "Subscription"("isActive", "endDate");
