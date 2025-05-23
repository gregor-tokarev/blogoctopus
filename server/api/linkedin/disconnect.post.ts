import { auth } from "~/server/lib/better-auth";
import { db } from "~/server/lib/db";
import { linkedinIntegrations } from "~/server/schema";
import { eq } from "drizzle-orm";
import { linkedinDisconnectResponseSchema } from "~/lib/network-contracts/linkedin";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  try {
    const result = await db
      .delete(linkedinIntegrations)
      .where(eq(linkedinIntegrations.userId, session.user.id))
      .returning(); // Use returning() to see if a row was actually deleted

    if (result.length === 0) {
      // No integration found to delete, could be considered a success or a specific status
      return linkedinDisconnectResponseSchema.parse({
        success: true, // Or false, depending on desired behavior if not found
        message:
          "No LinkedIn integration found to disconnect or already disconnected.",
      });
    }

    return linkedinDisconnectResponseSchema.parse({
      success: true,
      message: "LinkedIn integration disconnected successfully.",
    });
  } catch (error) {
    console.error("Error disconnecting LinkedIn integration:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to disconnect LinkedIn integration.",
    });
  }
});
