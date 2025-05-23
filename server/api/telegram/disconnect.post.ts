import { auth } from "~/server/lib/better-auth";
import { db } from "~/server/lib/db";
import { telegramIntegrations } from "~/server/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  try {
    // Get the session to identify the user
    const session = await auth.api.getSession(toWebRequest(event));
    if (!session?.user) {
      throw createError({
        statusCode: 401,
        message: "Неавторизован",
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
      message: "Интеграция с Telegram успешно отключена",
    };
  } catch (error) {
    console.error("Error disconnecting Telegram:", error);
    throw createError({
      statusCode: 500,
      message: "Не удалось отключить интеграцию с Telegram",
    });
  }
});
