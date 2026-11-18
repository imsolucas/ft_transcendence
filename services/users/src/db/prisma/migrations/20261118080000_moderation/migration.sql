-- AlterTable
ALTER TABLE "Messages" ADD COLUMN     "moderation" TEXT,
ADD COLUMN     "moderationReason" TEXT;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "chatMutedUntil" TIMESTAMP(3);
