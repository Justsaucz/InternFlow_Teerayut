ALTER TABLE "ScreeningTemplate" ADD COLUMN "onApply" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "ApplicationPreparation" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "jobPostId" TEXT NOT NULL,
 "documentIds" TEXT[], "hashes" JSONB NOT NULL, "report" JSONB NOT NULL,
 "contribution" TEXT NOT NULL, "skills" TEXT NOT NULL, "model" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ApplicationPreparation_userId_expiresAt_idx" ON "ApplicationPreparation"("userId", "expiresAt");
