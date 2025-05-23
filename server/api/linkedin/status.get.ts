import { auth } from "~/server/lib/better-auth";
import { db } from "~/server/lib/db";
import { linkedinIntegrations } from "~/server/schema";
import { eq } from "drizzle-orm";
import { linkedinStatusResponseSchema } from "~/lib/network-contracts/linkedin";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const existingIntegration = await db
    .select()
    .from(linkedinIntegrations)
    .where(eq(linkedinIntegrations.userId, session.user.id))
    .limit(1)
    .then((results) => results[0] || null);

  if (
    existingIntegration &&
    existingIntegration.accessToken &&
    existingIntegration.expiresAt &&
    new Date() < new Date(existingIntegration.expiresAt)
  ) {
    return linkedinStatusResponseSchema.parse({
      isConnected: true,
      profileId: existingIntegration.profileId ?? undefined,
    });
  }

  return linkedinStatusResponseSchema.parse({
    isConnected: false,
  });
});
