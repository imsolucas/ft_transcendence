import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./src/db/prisma/schema.prisma", // Path to your schema.prisma file
    client: {
      output: "./node_modules/.prisma/client", // Path to generate the Prisma Client
    },
});
