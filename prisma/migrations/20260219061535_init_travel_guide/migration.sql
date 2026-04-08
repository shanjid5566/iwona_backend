/*
  Warnings:

  - You are about to drop the column `category` on the `TravelGuide` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `TravelGuide` table. All the data in the column will be lost.
  - Added the required column `content` to the `TravelGuide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `TravelGuide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `readTime` to the `TravelGuide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TravelGuide` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TravelGuide" DROP COLUMN "category",
DROP COLUMN "description",
ADD COLUMN     "content" JSONB NOT NULL,
ADD COLUMN     "heroImage" TEXT,
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "readTime" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "layout" SET DEFAULT 'Standard';
