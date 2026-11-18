-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "dailyInitials" VARCHAR(3);

-- CreateTable
CREATE TABLE "DailyRuns" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "attempt" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "score" INTEGER,
    "ticks" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "DailyRuns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyRuns_day_score_idx" ON "DailyRuns"("day", "score");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRuns_userId_day_attempt_key" ON "DailyRuns"("userId", "day", "attempt");

-- AddForeignKey
ALTER TABLE "DailyRuns" ADD CONSTRAINT "DailyRuns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

