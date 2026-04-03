-- CreateEnum
CREATE TYPE "PdfCatalogType" AS ENUM ('accessories', 'marmista');

-- DropForeignKey
ALTER TABLE "InternalMeasure" DROP CONSTRAINT "InternalMeasure_articleId_fkey";

-- AlterTable
ALTER TABLE "CoffinArticle" ADD COLUMN     "measureId" TEXT;

-- AlterTable
ALTER TABLE "PdfCatalog" ADD COLUMN     "type" "PdfCatalogType" NOT NULL;

-- DropTable
DROP TABLE "InternalMeasure";

-- CreateTable
CREATE TABLE "CoffinMeasure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "head" DOUBLE PRECISION NOT NULL,
    "feet" DOUBLE PRECISION NOT NULL,
    "shoulder" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CoffinMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoffinMeasure_code_key" ON "CoffinMeasure"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PdfCatalog_type_key" ON "PdfCatalog"("type");

-- AddForeignKey
ALTER TABLE "CoffinArticle" ADD CONSTRAINT "CoffinArticle_measureId_fkey" FOREIGN KEY ("measureId") REFERENCES "CoffinMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
