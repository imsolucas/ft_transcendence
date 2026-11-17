import { prisma } from "../../client.ts";

export async function seedTournaments() {
  // These users are already seeded by users.ts
  const usernames = ["Alice", "Bob", "Charlie", "Donald"];
  const emails = [
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com",
    "donald@example.com"
  ];

  // Fetch user IDs by email (guaranteed to exist)
  const allUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, username: true, displayUsername: true, email: true },
  });

  // Map usernames to IDs for easy reference
  // usernames are stored lowercased (Better Auth); key the map by display name
  const userMap = Object.fromEntries(allUsers.map(u => [u.displayUsername ?? u.username, u.id]));

  // Create tournament
  const tournament = await prisma.tournament.create({
    data: {
      name: "Example Tournament",
      start_at: new Date("2025-11-16T10:59:00Z"),
    },
  });

  // Add players to tournament
  for (const username of usernames) {
    await prisma.tournamentPlayer.create({
      data: {
        tournamentId: tournament.id,
        userId: userMap[username],
      },
    });
  }

  // Create matches (using seeded users)
  const matches = [
    {
      player1Id: userMap["Alice"],
      player2Id: userMap["Bob"],
      player1DisplayName: "Alice",
      player2DisplayName: "Bob",
      player1Score: 5,
      player2Score: 0,
      winnerId: userMap["Alice"],
      played_at: new Date("2025-11-16T11:00:00Z"),
      end_at: new Date("2025-11-16T11:05:00Z"),
    },
    {
      player1Id: userMap["Alice"],
      player2Id: userMap["Charlie"],
      player1DisplayName: "Alice",
      player2DisplayName: "Charlie",
      player1Score: 5,
      player2Score: 0,
      winnerId: userMap["Alice"],
      played_at: new Date("2025-11-16T11:06:00Z"),
      end_at: new Date("2025-11-16T11:10:00Z"),
    },
    {
      player1Id: userMap["Alice"],
      player2Id: userMap["Donald"],
      player1DisplayName: "Alice",
      player2DisplayName: "Donald",
      player1Score: 5,
      player2Score: 0,
      winnerId: userMap["Alice"],
      played_at: new Date("2025-11-16T11:11:00Z"),
      end_at: new Date("2025-11-16T11:15:00Z"),
    },
  ];

  for (const match of matches) {
    await prisma.match.create({
      data: {
        ...match,
        tournamentId: tournament.id,
      },
    });
  }

  // Set tournament winner and end time
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      winnerId: userMap["Alice"],
      end_at: new Date("2025-11-16T11:15:00Z"),
    },
  });

  console.log("Seeded tournament, players, and matches!");
}
