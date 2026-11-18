-- CreateTable
CREATE TABLE "Purchases" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "item" VARCHAR(48) NOT NULL,
    "cost" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestClaims" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "day" VARCHAR(10) NOT NULL,
    "quest" VARCHAR(32) NOT NULL,
    "reward" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestClaims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Purchases_userId_item_key" ON "Purchases"("userId", "item");

-- CreateIndex
CREATE UNIQUE INDEX "QuestClaims_userId_day_quest_key" ON "QuestClaims"("userId", "day", "quest");

-- AddForeignKey
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestClaims" ADD CONSTRAINT "QuestClaims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

