import { auth } from "~/server/better-auth";

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event));
});
