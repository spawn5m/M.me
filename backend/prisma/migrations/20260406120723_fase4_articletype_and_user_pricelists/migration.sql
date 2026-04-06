/*
  Warnings:

  - Added the required column `articleType` to the `PriceList` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ArticleType" AS ENUM ('funeral', 'marmista');

-- AlterTable
ALTER TABLE "PriceList" ADD COLUMN     "articleType" "ArticleType" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "funeralPriceListId" TEXT,
ADD COLUMN     "marmistaPriceListId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_funeralPriceListId_fkey" FOREIGN KEY ("funeralPriceListId") REFERENCES "PriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_marmistaPriceListId_fkey" FOREIGN KEY ("marmistaPriceListId") REFERENCES "PriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
