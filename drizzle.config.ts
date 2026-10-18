import { defineConfig } from "drizzle-kit";
import { env } from "./server/env";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  tablesFilter: ["resumes", "users"],
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
