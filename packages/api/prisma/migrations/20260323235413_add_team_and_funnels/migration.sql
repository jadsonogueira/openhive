-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "FunnelStepType" AS ENUM ('LANDING_PAGE', 'LEAD_CAPTURE', 'EMAIL_SEQUENCE', 'SALES_PAGE', 'CHECKOUT', 'UPSELL', 'THANK_YOU', 'WEBINAR', 'VIDEO', 'SOCIAL_POST', 'AD', 'OTHER');

-- CreateEnum
CREATE TYPE "FunnelStepStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funnel" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelStage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "order" INTEGER NOT NULL DEFAULT 0,
    "funnelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelStep" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "FunnelStepType" NOT NULL DEFAULT 'OTHER',
    "link" TEXT,
    "status" "FunnelStepStatus" NOT NULL DEFAULT 'TODO',
    "order" INTEGER NOT NULL DEFAULT 0,
    "stageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunnelStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_ownerId_idx" ON "Invitation"("ownerId");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Funnel_userId_idx" ON "Funnel"("userId");

-- CreateIndex
CREATE INDEX "FunnelStage_funnelId_idx" ON "FunnelStage"("funnelId");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelStage_funnelId_order_key" ON "FunnelStage"("funnelId", "order");

-- CreateIndex
CREATE INDEX "FunnelStep_stageId_idx" ON "FunnelStep"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "FunnelStep_stageId_order_key" ON "FunnelStep"("stageId", "order");

-- CreateIndex
CREATE INDEX "User_ownerId_idx" ON "User"("ownerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funnel" ADD CONSTRAINT "Funnel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelStage" ADD CONSTRAINT "FunnelStage_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "Funnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunnelStep" ADD CONSTRAINT "FunnelStep_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "FunnelStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
