import { defineConfig } from "drizzle-kit";
import {serverEnv} from "./env/server";

export default defineConfig({
  out: "./migrations",
  schema: "./server/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: serverEnv.DATABASE_URL,
  },
});
