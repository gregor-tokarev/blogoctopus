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
    
    // Delete the Telegram integration for this user
    await db
      .delete(telegramIntegrations)
      .where(eq(telegramIntegrations.userId, userId));
    
    return {
      success: true,
      message: "Telegram integration successfully disconnected"
    };
  } catch (error) {
    console.error('Error disconnecting Telegram:', error);
    throw createError({
      statusCode: 500,
      message: "Failed to disconnect Telegram integration"
    });
  }
});
