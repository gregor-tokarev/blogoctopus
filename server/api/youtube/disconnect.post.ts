import { auth } from "~/server/lib/better-auth";
import { db } from "~/server/lib/db";
import { youtubeIntegrations } from "~/server/schema";
import { eq } from "drizzle-orm";
import { youtubeDisconnectResponseSchema } from "~/lib/network-contracts/youtube";

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
    // Optional: Revoke the token on Google's end
    // This step would require retrieving the token first, then making a call to Google's revocation endpoint
    // Not implementing it here for brevity, but in production you might want to do this

    // Delete the integration from our database
    await db
      .delete(youtubeIntegrations)
      .where(eq(youtubeIntegrations.userId, userId))
      .execute();

    return youtubeDisconnectResponseSchema.parse({
      success: true,
      message: "YouTube интеграция успешно отключена.",
    });
  } catch (error) {
    console.error('Error disconnecting YouTube integration:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to disconnect YouTube integration',
    });
  }
});
