-- AlterTable
ALTER TABLE "Matches" ADD COLUMN "player1RatingDelta" INTEGER,
ADD COLUMN "player2RatingDelta" INTEGER,
ADD COLUMN "ranked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "seasonId" INTEGER;

-- CreateTable
CREATE TABLE "Seasons" (
    "id" SERIAL NOT NULL,
    "number" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ratings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "rd" DOUBLE PRECISION NOT NULL,
    "vol" DOUBLE PRECISION NOT NULL,
    "games" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "peak" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seasons_number_key" ON "Seasons"("number");

-- CreateIndex
CREATE INDEX "Seasons_startsAt_idx" ON "Seasons"("startsAt");

-- CreateIndex
CREATE INDEX "Ratings_seasonId_rating_idx" ON "Ratings"("seasonId", "rating");

-- CreateIndex
CREATE UNIQUE INDEX "Ratings_userId_seasonId_key" ON "Ratings"("userId", "seasonId");

-- AddForeignKey
ALTER TABLE "Ratings" ADD CONSTRAINT "Ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ratings" ADD CONSTRAINT "Ratings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
