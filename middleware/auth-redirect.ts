import { authClient } from "~/lib/auth-client";

export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.getSession();

  if (to.fullPath.includes("/dashboard") && !session?.user) {
    return navigateTo('/auth');
  }
})
