import { prisma } from "../../client.ts";

// Seeds the dev accounts only into an empty database, so restarts never duplicate rows.
const users = await prisma.user.count();
if (users > 0) {
  console.log(`seed: skipped (${users} users already exist)`);
  process.exit(0);
}
await import("./index.ts");
