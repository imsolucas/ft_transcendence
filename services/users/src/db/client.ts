import { PrismaClient } from "@prisma/client";

// One PrismaClient per process. Import this instead of calling `new PrismaClient()`.
export const prisma = new PrismaClient();
