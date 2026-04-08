/*
  Warnings:

  - You are about to drop the column `isMonthly` on the `Giveaway` table. All the data in the column will be lost.
  - The `status` column on the `Giveaway` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `description` to the `Giveaway` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Giveaway` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `TravelGuide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `TravelGuide` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GiveawayStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "Giveaway" DROP COLUMN "isMonthly",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "giveawayImage" TEXT,
ADD COLUMN     "isMonthlyActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "GiveawayStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "giftedBy" TEXT,
ADD COLUMN     "isGifted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TravelGuide" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "description" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "GiveawayEntry" (
    "id" TEXT NOT NULL,
    "giveawayId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiveawayEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GiveawayEntry_giveawayId_idx" ON "GiveawayEntry"("giveawayId");

-- CreateIndex
CREATE INDEX "GiveawayEntry_userId_idx" ON "GiveawayEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GiveawayEntry_giveawayId_userId_key" ON "GiveawayEntry"("giveawayId", "userId");

-- CreateIndex
CREATE INDEX "Giveaway_status_idx" ON "Giveaway"("status");

-- CreateIndex
CREATE INDEX "Giveaway_isMonthlyActive_idx" ON "Giveaway"("isMonthlyActive");

-- CreateIndex
CREATE INDEX "TravelGuide_category_idx" ON "TravelGuide"("category");

-- AddForeignKey
ALTER TABLE "GiveawayEntry" ADD CONSTRAINT "GiveawayEntry_giveawayId_fkey" FOREIGN KEY ("giveawayId") REFERENCES "Giveaway"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiveawayEntry" ADD CONSTRAINT "GiveawayEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
