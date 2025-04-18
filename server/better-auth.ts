import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./schema";
import {magicLink} from "better-auth/plugins";
import {NOREPLY_EMAIL, resendClient} from "~/server/resend";
import {serverEnv} from "~/env/server";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
    },
  }),
  secret: serverEnv.BETTER_AUTH_SECRET,
  url: serverEnv.BETTER_AUTH_URL,

  socialProviders: {
    google: {
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_AUTH_SECRET
    }
  },

  plugins: [
      magicLink({
        sendMagicLink: async ({email, url}) => {
          await resendClient.emails.send({
            from: NOREPLY_EMAIL,
            to: email,
            subject: "Подтверждение почты",
            html: `
            Нажмите на ссылку для подтверждения
            <a href="${url}">${url}</a>
            `
          })
        }
      })
  ]
});
