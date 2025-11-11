import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export async function seedFriendships() {
    const friendships = [
        { requesterId: 1, addresseeId: 2, status: "ACCEPTED" as const },
        { requesterId: 2, addresseeId: 3, status: "PENDING" as const }
    ];

    for (const friendship of friendships) {
        await db.friendship.create({ data: friendship });
        console.log("Created friendship:", friendship);
    }

    const all = await db.friendship.findMany();
    console.log("Friendships in DB:", all.length);
}
