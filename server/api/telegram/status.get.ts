import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { telegramIntegrations } from "~/server/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    // Get the session to identify the user
    const session = await auth.api.getSession(toWebRequest(event));
    if (!session?.user) {
      throw createError({
        statusCode: 401,
        message: "Unauthorized"
      });
    }
    
    // Get the user ID from the session
    const userId = session.user.id;
    
    // Check if the user has a Telegram integration
    const integration = await db
      .select()
      .from(telegramIntegrations)
      .where(eq(telegramIntegrations.userId, userId))
      .limit(1)
      .then(results => results[0] || null);
    
    return {
      isConnected: !!integration,
      integration: integration ? {
        id: integration.id,
        channelUsername: integration.channelUsername,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      } : null
    };
  } catch (error) {
    console.error('Error checking Telegram status:', error);
    throw createError({
      statusCode: 500,
      message: "Failed to check Telegram integration status"
    });
  }
});
