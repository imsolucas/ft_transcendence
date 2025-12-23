import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export async function seedMatchHistory() {
  // Example users (replace with actual user IDs from your Users table)
  const player1Id = 1;
  const player2Id = 2;

  const matches = [
    {
      player1Id,
      player2Id,
      player1Score: 10,
      player2Score: 8,
      player1DisplayName: "Alice",
      player2DisplayName: "Bob",
	  winnerId: player1Id,
      played_at: new Date("2025-11-06T10:30:00Z"),
      end_at: new Date("2025-11-06T10:40:00Z"),
    },
    {
      player1Id: player2Id,
      player2Id: player1Id,
      player1Score: 7,
      player2Score: 10,
      player1DisplayName: "Bob",
      player2DisplayName: "Alice",
	  winnerId: player2Id,
      played_at: new Date("2025-11-07T14:00:00Z"),
      end_at: new Date("2025-11-07T14:10:00Z"),
    },
  ];

  for (const match of matches) {
    await db.match.create({ data: match });
  }

  const all = await db.match.findMany();
  console.log("Match histories in DB:", all.length);
}
