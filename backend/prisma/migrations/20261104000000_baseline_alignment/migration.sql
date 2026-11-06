-- Align the historical migration chain with the already-existing app schema.
-- Preserve legacy university data by refusing to remove populated relations.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "University") OR EXISTS (SELECT 1 FROM "User" WHERE "universityId" IS NOT NULL) OR EXISTS (SELECT 1 FROM "StudentProfile" WHERE "universityId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Legacy university data exists. Export and migrate these records before applying baseline alignment.';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING_REVIEW', 'COMPANY_EVALUATED', 'GRADED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationStatus" ADD VALUE 'INTERVIEW_SCHEDULED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'COMMITTED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'CANCEL_REQUESTED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'CANCELLED';

-- DropForeignKey
ALTER TABLE "StudentProfile" DROP CONSTRAINT "StudentProfile_universityId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_universityId_fkey";

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "cancellationReason" TEXT;

-- AlterTable
ALTER TABLE "CompanyProfile" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT;

-- AlterTable
ALTER TABLE "JobPost" ADD COLUMN     "applicationLink" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactLine" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "workingHours" TEXT;

-- AlterTable
ALTER TABLE "StudentProfile" DROP COLUMN "universityId",
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "university" TEXT DEFAULT '',
ALTER COLUMN "studentId" SET DEFAULT '',
ALTER COLUMN "major" SET DEFAULT '',
ALTER COLUMN "faculty" SET DEFAULT '',
ALTER COLUMN "year" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "universityId",
ADD COLUMN     "avatarUrl" TEXT;

-- DropTable
DROP TABLE "University";

-- CreateTable
CREATE TABLE "WeeklyLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "applicationId" TEXT,
    "weekNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "workModality" TEXT NOT NULL DEFAULT 'ON_SITE',
    "supervisorName" TEXT,
    "plannedTasks" TEXT,
    "tasksDone" TEXT NOT NULL,
    "problemsAndSolutions" TEXT,
    "learnings" TEXT NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 40.0,
    "attachmentUrl" TEXT,
    "mentorApproved" BOOLEAN NOT NULL DEFAULT false,
    "mentorRating" INTEGER,
    "mentorFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "applicationId" TEXT,
    "logDate" TIMESTAMP(3) NOT NULL,
    "weekNumber" INTEGER NOT NULL DEFAULT 1,
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "workModality" TEXT NOT NULL DEFAULT 'ON_SITE',
    "supervisorName" TEXT,
    "tasksDone" TEXT NOT NULL,
    "problemsAndSolutions" TEXT,
    "learnings" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "isBackdated" BOOLEAN NOT NULL DEFAULT false,
    "mentorApproved" BOOLEAN NOT NULL DEFAULT false,
    "mentorRating" INTEGER,
    "mentorFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternshipEvaluation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "applicationId" TEXT,
    "workQualityScore" INTEGER NOT NULL DEFAULT 5,
    "punctualityScore" INTEGER NOT NULL DEFAULT 5,
    "teamworkScore" INTEGER NOT NULL DEFAULT 5,
    "feedback" TEXT NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'COMPANY_EVALUATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternshipEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_studentId_logDate_key" ON "DailyLog"("studentId", "logDate");

-- CreateIndex
CREATE UNIQUE INDEX "InternshipEvaluation_applicationId_key" ON "InternshipEvaluation"("applicationId");

-- AddForeignKey
ALTER TABLE "WeeklyLog" ADD CONSTRAINT "WeeklyLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyLog" ADD CONSTRAINT "WeeklyLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipEvaluation" ADD CONSTRAINT "InternshipEvaluation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipEvaluation" ADD CONSTRAINT "InternshipEvaluation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipEvaluation" ADD CONSTRAINT "InternshipEvaluation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
