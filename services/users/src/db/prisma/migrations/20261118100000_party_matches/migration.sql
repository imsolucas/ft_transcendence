-- CreateTable
CREATE TABLE "PartyMatches" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "winnerId" INTEGER,
    "played_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyMatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyMatchPlayers" (
    "id" SERIAL NOT NULL,
    "partyMatchId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "placement" INTEGER NOT NULL,
    "livesLeft" INTEGER NOT NULL,

    CONSTRAINT "PartyMatchPlayers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartyMatches_externalId_key" ON "PartyMatches"("externalId");

-- CreateIndex
CREATE INDEX "PartyMatches_winnerId_idx" ON "PartyMatches"("winnerId");

-- CreateIndex
CREATE INDEX "PartyMatchPlayers_userId_idx" ON "PartyMatchPlayers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyMatchPlayers_partyMatchId_userId_key" ON "PartyMatchPlayers"("partyMatchId", "userId");

-- AddForeignKey
ALTER TABLE "PartyMatches" ADD CONSTRAINT "PartyMatches_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMatchPlayers" ADD CONSTRAINT "PartyMatchPlayers_partyMatchId_fkey" FOREIGN KEY ("partyMatchId") REFERENCES "PartyMatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMatchPlayers" ADD CONSTRAINT "PartyMatchPlayers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
