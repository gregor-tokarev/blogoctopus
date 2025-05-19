import { auth } from "~/server/lib/better-auth";
import { db } from "~/server/lib/db";
import { youtubeIntegrations } from "~/server/schema";
import { eq } from "drizzle-orm";
import { youtubeStatusResponseSchema } from "~/lib/network-contracts/youtube";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const userId = session.user.id;

  try {
    const integration = await db
      .select()
      .from(youtubeIntegrations)
      .where(eq(youtubeIntegrations.userId, userId))
      .limit(1)
      .then(results => results[0] ?? null);

    return youtubeStatusResponseSchema.parse({
      isConnected: !!integration,
      channelId: integration?.channelId,
      channelTitle: integration?.channelTitle,
    });
  } catch (error) {
    console.error('Error checking YouTube integration status:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to check YouTube integration status',
    });
  }
});
