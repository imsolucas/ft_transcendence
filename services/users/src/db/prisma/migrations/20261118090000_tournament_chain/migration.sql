-- AlterTable
ALTER TABLE "Tournaments" ADD COLUMN     "chainBlock" INTEGER,
ADD COLUMN     "chainContract" TEXT,
ADD COLUMN     "chainError" TEXT,
ADD COLUMN     "chainRecordedAt" TIMESTAMP(3),
ADD COLUMN     "chainResultHash" TEXT,
ADD COLUMN     "chainTxHash" TEXT;

-- CreateTable
CREATE TABLE "ChainDeployments" (
    "id" SERIAL NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChainDeployments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tournaments_chainContract_idx" ON "Tournaments"("chainContract");

-- CreateIndex
CREATE INDEX "ChainDeployments_chainId_owner_id_idx" ON "ChainDeployments"("chainId", "owner", "id");
