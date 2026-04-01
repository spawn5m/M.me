-- CreateEnum
CREATE TYPE "PriceListType" AS ENUM ('purchase', 'sale');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'absolute');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserManager" (
    "managerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserManager_pkey" PRIMARY KEY ("managerId","userId")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "CoffinArticle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoffinArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalMeasure" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "head" DOUBLE PRECISION NOT NULL,
    "feet" DOUBLE PRECISION NOT NULL,
    "shoulder" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InternalMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffinCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "CoffinCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffinSubcategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "CoffinSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Essence" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Essence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Figure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Figure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finish" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Finish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessoryArticle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "imageUrl" TEXT,
    "pdfPage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessoryArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessoryCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "AccessoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessorySubcategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "AccessorySubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarmistaArticle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "pdfPage" INTEGER,
    "publicPrice" DOUBLE PRECISION,
    "accessoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarmistaArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarmistaCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "MarmistaCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PriceListType" NOT NULL,
    "parentId" TEXT,
    "autoUpdate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRule" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "filterType" TEXT,
    "filterValue" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PriceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "coffinArticleId" TEXT,
    "accessoryArticleId" TEXT,
    "marmistaArticleId" TEXT,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfCatalog" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdfCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CoffinArticleToCoffinCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CoffinArticleToCoffinCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CoffinArticleToCoffinSubcategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CoffinArticleToCoffinSubcategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CoffinArticleToEssence" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CoffinArticleToEssence_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CoffinArticleToFigure" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CoffinArticleToFigure_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CoffinArticleToColor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CoffinArticleToColor_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CoffinArticleToFinish" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CoffinArticleToFinish_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AccessoryArticleToAccessoryCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AccessoryArticleToAccessoryCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AccessoryArticleToAccessorySubcategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AccessoryArticleToAccessorySubcategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MarmistaArticleToMarmistaCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MarmistaArticleToMarmistaCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "CoffinArticle_code_key" ON "CoffinArticle"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InternalMeasure_articleId_key" ON "InternalMeasure"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "CoffinCategory_code_key" ON "CoffinCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CoffinSubcategory_code_key" ON "CoffinSubcategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Essence_code_key" ON "Essence"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Figure_code_key" ON "Figure"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Color_code_key" ON "Color"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Finish_code_key" ON "Finish"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AccessoryArticle_code_key" ON "AccessoryArticle"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AccessoryCategory_code_key" ON "AccessoryCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AccessorySubcategory_code_key" ON "AccessorySubcategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MarmistaArticle_code_key" ON "MarmistaArticle"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MarmistaCategory_code_key" ON "MarmistaCategory"("code");

-- CreateIndex
CREATE INDEX "_CoffinArticleToCoffinCategory_B_index" ON "_CoffinArticleToCoffinCategory"("B");

-- CreateIndex
CREATE INDEX "_CoffinArticleToCoffinSubcategory_B_index" ON "_CoffinArticleToCoffinSubcategory"("B");

-- CreateIndex
CREATE INDEX "_CoffinArticleToEssence_B_index" ON "_CoffinArticleToEssence"("B");

-- CreateIndex
CREATE INDEX "_CoffinArticleToFigure_B_index" ON "_CoffinArticleToFigure"("B");

-- CreateIndex
CREATE INDEX "_CoffinArticleToColor_B_index" ON "_CoffinArticleToColor"("B");

-- CreateIndex
CREATE INDEX "_CoffinArticleToFinish_B_index" ON "_CoffinArticleToFinish"("B");

-- CreateIndex
CREATE INDEX "_AccessoryArticleToAccessoryCategory_B_index" ON "_AccessoryArticleToAccessoryCategory"("B");

-- CreateIndex
CREATE INDEX "_AccessoryArticleToAccessorySubcategory_B_index" ON "_AccessoryArticleToAccessorySubcategory"("B");

-- CreateIndex
CREATE INDEX "_MarmistaArticleToMarmistaCategory_B_index" ON "_MarmistaArticleToMarmistaCategory"("B");

-- AddForeignKey
ALTER TABLE "UserManager" ADD CONSTRAINT "UserManager_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserManager" ADD CONSTRAINT "UserManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalMeasure" ADD CONSTRAINT "InternalMeasure_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "CoffinArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarmistaArticle" ADD CONSTRAINT "MarmistaArticle_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "MarmistaArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceList" ADD CONSTRAINT "PriceList_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PriceList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRule" ADD CONSTRAINT "PriceRule_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_coffinArticleId_fkey" FOREIGN KEY ("coffinArticleId") REFERENCES "CoffinArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_accessoryArticleId_fkey" FOREIGN KEY ("accessoryArticleId") REFERENCES "AccessoryArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_marmistaArticleId_fkey" FOREIGN KEY ("marmistaArticleId") REFERENCES "MarmistaArticle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToCoffinCategory" ADD CONSTRAINT "_CoffinArticleToCoffinCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "CoffinArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToCoffinCategory" ADD CONSTRAINT "_CoffinArticleToCoffinCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "CoffinCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToCoffinSubcategory" ADD CONSTRAINT "_CoffinArticleToCoffinSubcategory_A_fkey" FOREIGN KEY ("A") REFERENCES "CoffinArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToCoffinSubcategory" ADD CONSTRAINT "_CoffinArticleToCoffinSubcategory_B_fkey" FOREIGN KEY ("B") REFERENCES "CoffinSubcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToEssence" ADD CONSTRAINT "_CoffinArticleToEssence_A_fkey" FOREIGN KEY ("A") REFERENCES "CoffinArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToEssence" ADD CONSTRAINT "_CoffinArticleToEssence_B_fkey" FOREIGN KEY ("B") REFERENCES "Essence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToFigure" ADD CONSTRAINT "_CoffinArticleToFigure_A_fkey" FOREIGN KEY ("A") REFERENCES "CoffinArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToFigure" ADD CONSTRAINT "_CoffinArticleToFigure_B_fkey" FOREIGN KEY ("B") REFERENCES "Figure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToColor" ADD CONSTRAINT "_CoffinArticleToColor_A_fkey" FOREIGN KEY ("A") REFERENCES "CoffinArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToColor" ADD CONSTRAINT "_CoffinArticleToColor_B_fkey" FOREIGN KEY ("B") REFERENCES "Color"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToFinish" ADD CONSTRAINT "_CoffinArticleToFinish_A_fkey" FOREIGN KEY ("A") REFERENCES "CoffinArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoffinArticleToFinish" ADD CONSTRAINT "_CoffinArticleToFinish_B_fkey" FOREIGN KEY ("B") REFERENCES "Finish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccessoryArticleToAccessoryCategory" ADD CONSTRAINT "_AccessoryArticleToAccessoryCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "AccessoryArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccessoryArticleToAccessoryCategory" ADD CONSTRAINT "_AccessoryArticleToAccessoryCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "AccessoryCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccessoryArticleToAccessorySubcategory" ADD CONSTRAINT "_AccessoryArticleToAccessorySubcategory_A_fkey" FOREIGN KEY ("A") REFERENCES "AccessoryArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccessoryArticleToAccessorySubcategory" ADD CONSTRAINT "_AccessoryArticleToAccessorySubcategory_B_fkey" FOREIGN KEY ("B") REFERENCES "AccessorySubcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MarmistaArticleToMarmistaCategory" ADD CONSTRAINT "_MarmistaArticleToMarmistaCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "MarmistaArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MarmistaArticleToMarmistaCategory" ADD CONSTRAINT "_MarmistaArticleToMarmistaCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "MarmistaCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
