-- AlterTable
ALTER TABLE "gig" ADD COLUMN "official" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "gig_official_idx" ON "gig"("official");
