/*
  Warnings:

  - Added the required column `description` to the `TravelDeal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TravelDeal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TravelDeal" ADD COLUMN     "dealImage" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "discount" DOUBLE PRECISION,
ADD COLUMN     "flightBookingLink" TEXT,
ADD COLUMN     "hotelBookingLink" TEXT,
ADD COLUMN     "travelEndDate" TIMESTAMP(3),
ADD COLUMN     "travelStartDate" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "TravelDeal_status_idx" ON "TravelDeal"("status");

-- CreateIndex
CREATE INDEX "TravelDeal_isFeatured_idx" ON "TravelDeal"("isFeatured");
