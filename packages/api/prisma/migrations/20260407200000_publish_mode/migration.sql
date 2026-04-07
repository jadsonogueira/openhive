-- CreateEnum
CREATE TYPE "PublishMode" AS ENUM ('FEED', 'REELS', 'STORIES');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "publishMode" "PublishMode" NOT NULL DEFAULT 'FEED',
ADD COLUMN "lastError" TEXT;
