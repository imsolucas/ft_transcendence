import { auth } from "../../../auth/auth.ts";
import { prisma } from "../../client.ts";

// Dev accounts. Passwords meet the 8-character minimum; sign in with username or email.
export const DEV_USERS = [
  { username: "Alice", email: "alice@example.com", password: "alice-dev-1" },
  { username: "Bob", email: "bob@example.com", password: "bob-dev-22" },
  { username: "Charlie", email: "charlie@example.com", password: "charlie-dev-3" },
  { username: "Donald", email: "donald@example.com", password: "donald-dev-4" },
];

export async function seedUsers() {
  // Created through Better Auth so passwords are hashed and stored exactly as sign-in expects.
  for (const u of DEV_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email }, select: { id: true } });
    if (existing) {
      console.log("User exists:", u.email);
      continue;
    }
    await auth.api.signUpEmail({
      body: { email: u.email, password: u.password, name: u.username, username: u.username, displayUsername: u.username },
    });
    // dev accounts use example.com (no real inbox): mark them verified so they can sign in
    await prisma.user.update({ where: { email: u.email }, data: { emailVerified: true } });
    console.log("Created user:", u.email);
  }
  console.log("Users in DB:", await prisma.user.count());
}
