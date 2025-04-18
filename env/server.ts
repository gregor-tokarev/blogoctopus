import {createEnv} from "@t3-oss/env-nuxt";
import {z} from "zod";

export const serverEnv = createEnv({
    server: {
        DATABASE_URL: z.string().url(),

        BETTER_AUTH_SECRET: z.string().min(2),
        BETTER_AUTH_URL: z.string().min(2),

        GOOGLE_CLIENT_ID: z.string().min(2),
        GOOGLE_AUTH_SECRET: z.string().min(2),

        RESEND_API_KEY: z.string().min(2),
    }
})
