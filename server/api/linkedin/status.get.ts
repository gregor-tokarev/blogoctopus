import { auth } from "~/server/lib/better-auth";
import { db } from "~/server/lib/db";
import { linkedinIntegrations } from "~/server/schema";
import { eq } from "drizzle-orm";
import { linkedinStatusResponseSchema } from "~/lib/network-contracts/linkedin";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    return linkedinStatusResponseSchema.parse({
      connected: false,
    });
  }
  const existingIntegration = await db
    .select()
    .from(linkedinIntegrations)
    .where(eq(linkedinIntegrations.userId, session.user.id))
    .limit(1)
    .then((results) => results[0] || null);

  if (existingIntegration && existingIntegration.accessToken) {
    // Optionally, you could add a check here to see if the token is still valid
    // For example, by making a simple API call to LinkedIn or checking expiresAt
    // It's important to handle token expiry and refresh if necessary in a real app.
    const isTokenStillLikelyValid = existingIntegration.expiresAt && new Date() < new Date(existingIntegration.expiresAt);

    if (isTokenStillLikelyValid) {
        return linkedinStatusResponseSchema.parse({
            connected: true,
            profileId: existingIntegration.linkedinProfileId || undefined,
        });
    } else {
        // Token might be expired, you could attempt a refresh or delete it.
        // For simplicity, we'll consider it disconnected if expired.
        // You might also want to log this or inform the user.
        await db.delete(linkedinIntegrations).where(eq(linkedinIntegrations.id, existingIntegration.id));
    }
  }

  return linkedinStatusResponseSchema.parse({
    connected: false,
  });
});
