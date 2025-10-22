import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";

const db = new PrismaClient();

const users = [
  { username: "alice", email: "alice@example.com", password: "1111", avatar: "https://i.pravatar.cc/150?u=alice" },
  { username: "bob",   email: "bob@example.com",   password: "2222", avatar: "https://i.pravatar.cc/150?u=bob" },
  { username: "bruno", email: "bruno@example.com", password: "3333", avatar: "https://i.pravatar.cc/150?u=bruno" },
];

export async function seed() {
  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: u,
      create: u,
    });
    console.log("Upserted:", u.email);
  }

  const all = await db.user.findMany();
  console.log("Users in DB:", all.length);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  seed()
    .catch((e) => {
      console.error("Seeder error:", e);
      process.exitCode = 1;
    })
    .finally(async () => {
      await db.$disconnect();
    });
}
