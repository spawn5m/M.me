-- AlterTable
ALTER TABLE "MarmistaArticle" ADD COLUMN     "color" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_ColorToMarmistaArticle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ColorToMarmistaArticle_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ColorToMarmistaArticle_B_index" ON "_ColorToMarmistaArticle"("B");

-- AddForeignKey
ALTER TABLE "_ColorToMarmistaArticle" ADD CONSTRAINT "_ColorToMarmistaArticle_A_fkey" FOREIGN KEY ("A") REFERENCES "Color"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ColorToMarmistaArticle" ADD CONSTRAINT "_ColorToMarmistaArticle_B_fkey" FOREIGN KEY ("B") REFERENCES "MarmistaArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
