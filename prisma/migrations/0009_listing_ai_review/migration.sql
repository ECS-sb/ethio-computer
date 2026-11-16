-- AlterTable
ALTER TABLE "listing" ADD COLUMN     "aiReview" JSONB,
ADD COLUMN     "aiReviewedAt" TIMESTAMP(3);
