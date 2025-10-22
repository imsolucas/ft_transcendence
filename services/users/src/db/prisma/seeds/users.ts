import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export async function seedUsers() {
  const users = [
    { username: "alice", email: "alice@example.com", avatar: "https://i.pravatar.cc/150?u=alice" },
    { username: "bob", email: "bob@example.com", avatar: "https://i.pravatar.cc/150?u=bob" },
    { username: "bruno", email: "bruno@example.com", avatar: "https://i.pravatar.cc/150?u=bruno" },
  ];

  for (const user of users) {
    await db.user.upsert({
      where: { email: user.email },
      update: user,
      create: user,
    });
    console.log("Upserted user:", user.email);
  }

  const all = await db.user.findMany();
  console.log("Users in DB:", all.length);
}
