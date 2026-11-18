-- Removed modules: blockchain tournament records and the public API (API keys).

-- DropTable
DROP TABLE IF EXISTS "ApiKeys";

-- DropTable
DROP TABLE IF EXISTS "ChainDeployments";

-- DropIndex
DROP INDEX IF EXISTS "Tournaments_chainContract_idx";

-- AlterTable
ALTER TABLE "Tournaments" DROP COLUMN IF EXISTS "chainBlock",
DROP COLUMN IF EXISTS "chainContract",
DROP COLUMN IF EXISTS "chainError",
DROP COLUMN IF EXISTS "chainRecordedAt",
DROP COLUMN IF EXISTS "chainResultHash",
DROP COLUMN IF EXISTS "chainTxHash";
