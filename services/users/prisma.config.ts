import { defineConfig } from "prisma/config";

// DATABASE_URL comes from the environment (compose passes it; locally export it).
export default defineConfig({
  schema: "./src/db/prisma/schema.prisma",
});
