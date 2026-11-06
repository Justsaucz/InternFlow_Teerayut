BEGIN;
ALTER TABLE "Application"
 ADD COLUMN "readinessEnabled" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "readinessStartDate" TIMESTAMP(3),
 ADD COLUMN "readinessDeadline" TIMESTAMP(3),
 ADD COLUMN "readinessVersion" INTEGER NOT NULL DEFAULT 0;
-- Preserve the previous schedules and confirmation versions for existing applications.
UPDATE "Application" a SET "readinessEnabled"=j."readinessEnabled",
 "readinessStartDate"=j."startDate", "readinessDeadline"=j."readinessDeadline",
 "readinessVersion"=j."readinessVersion"
FROM "JobPost" j WHERE a."jobPostId"=j.id AND j."readinessEnabled"=true;
CREATE INDEX "Application_readinessEnabled_readinessDeadline_idx" ON "Application"("readinessEnabled","readinessDeadline");
COMMIT;
