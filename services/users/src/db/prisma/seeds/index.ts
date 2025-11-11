import { seedUsers } from "./users.ts";
import { seedFriendships } from "./friendships.ts";
import { seedMatchHistory } from "./match-history.ts";
import { error } from "console";

export async function seed() {
    await seedUsers();
    await seedFriendships();
    await seedMatchHistory();
    console.log("Seeding complete!");
}

seed()
    .then(() => {
        console.log("Seeding finished successfully.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Seeding failed:", error);
        process.exit(1);
    })
