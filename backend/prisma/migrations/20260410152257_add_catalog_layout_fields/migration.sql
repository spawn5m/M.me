-- CreateEnum
CREATE TYPE "PageType" AS ENUM ('single', 'double');

-- AlterTable
ALTER TABLE "PdfCatalog" ADD COLUMN     "bodyPageType" "PageType" NOT NULL DEFAULT 'double',
ADD COLUMN     "firstPageType" "PageType" NOT NULL DEFAULT 'single',
ADD COLUMN     "lastPageType" "PageType" NOT NULL DEFAULT 'single',
ADD COLUMN     "layoutOffset" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pagesSlug" TEXT,
ADD COLUMN     "totalPdfPages" INTEGER;
