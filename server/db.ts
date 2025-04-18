import { drizzle } from "drizzle-orm/node-postgres";
import {serverEnv} from "~/env/server";

export const db = drizzle({
  connection: {
    connectionString: serverEnv.DATABASE_URL,
  },
});
