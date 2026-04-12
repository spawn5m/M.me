-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessoriesPriceListId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_accessoriesPriceListId_fkey" FOREIGN KEY ("accessoriesPriceListId") REFERENCES "PriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
