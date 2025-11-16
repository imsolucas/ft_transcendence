import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const db = new PrismaClient();

export async function seedUsers() {
  const rawUsers = [
    { username: "Alice", email: "alice@example.com", password: "1111", avatar: "https://i.pravatar.cc/150?u=alice" },
    { username: "Bob", email: "bob@example.com", password: "2222", avatar: "https://i.pravatar.cc/150?u=bob" },
    { username: "Charlie", email: "charlie@example.com", password: "3333", avatar: "https://i.pravatar.cc/150?u=charlie" },
    { username: "Donald", email: "donald@example.com", password: "4444", avatar: "https://i.pravatar.cc/150?u=donald" },
  ];

  const users = await Promise.all(
    rawUsers.map(async (u) => ({ ...u, password: await bcrypt.hash(u.password, 10) }))
  )

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
