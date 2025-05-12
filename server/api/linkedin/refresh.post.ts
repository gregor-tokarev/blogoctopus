import { db } from "~/server/lib/db";
import { linkedinIntegrations } from "~/server/schema";
import { serverEnv } from "~/env/server";
import { eq } from "drizzle-orm";
import { auth } from "~/server/lib/better-auth";

// TODO: Define request and response schemas if needed

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "User not authenticated",
    });
  }

  const userId = session.user.id;

  try {
    const integration = await db
      .select()
      .from(linkedinIntegrations)
      .where(eq(linkedinIntegrations.userId, userId))
      .limit(1)
      .then(results => results[0] || null);

    if (!integration || !integration.refreshToken) {
      throw createError({
        statusCode: 404,
        message: "LinkedIn integration or refresh token not found for this user.",
      });
    }

    const response = await $fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: integration.refreshToken,
        client_id: serverEnv.LINKEDIN_CLIENT_ID,
        client_secret: serverEnv.LINKEDIN_CLIENT_SECRET,
      }),
    });

    // @ts-ignore TODO: Add type for response
    const { access_token, expires_in, refresh_token: new_refresh_token } = response;

    if (!access_token) {
      throw createError({
        statusCode: 500,
        message: 'Failed to refresh access token from LinkedIn.',
      });
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await db.update(linkedinIntegrations)
      .set({
        accessToken: access_token,
        refreshToken: new_refresh_token || integration.refreshToken, // Use new refresh token if provided, else keep old
        expiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(linkedinIntegrations.id, integration.id))
      .execute();

    return { success: true, message: 'Access token refreshed successfully.' };

  } catch (error: any) {
    console.error('LinkedIn token refresh error:', error);
    // Potentially, if refresh token is invalid (e.g., revoked), clear it from DB
    // to prompt re-authentication.
    if (error.data?.error === 'invalid_grant') { // Example error, check LinkedIn docs for actual errors
        await db.update(linkedinIntegrations)
            .set({ refreshToken: null, updatedAt: new Date() })
            .where(eq(linkedinIntegrations.userId, userId))
            .execute();
        throw createError({
            statusCode: 401, // Unauthorized, re-auth needed
            message: 'LinkedIn refresh token is invalid. Please reconnect.',
        });
    }
    
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to refresh LinkedIn access token.',
      data: error.data
    });
  }
});
