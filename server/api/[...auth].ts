import { auth } from "~/server/lib/better-auth";

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event));
});
