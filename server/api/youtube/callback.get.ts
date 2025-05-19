import { auth } from "~/server/lib/better-auth";
import { db } from "~/server/lib/db";
import { youtubeIntegrations } from "~/server/schema";
import { youtubeCallbackRequestSchema } from "~/lib/network-contracts/youtube";
import { serverEnv } from "~/env/server";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const parsedQuery = youtubeCallbackRequestSchema.safeParse(query);

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      message: "Invalid callback parameters",
      data: parsedQuery.error.issues,
    });
  }

  const { code, state } = parsedQuery.data;

  // TODO: Verify the 'state' stored in the session/temporary store

  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "User not authenticated during callback",
    });
  }

  try {
    // Exchange the authorization code for access and refresh tokens
    const tokenResponse = await $fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: serverEnv.YOUTUBE_REDIRECT_URI,
        client_id: serverEnv.YOUTUBE_CLIENT_ID,
        client_secret: serverEnv.YOUTUBE_CLIENT_SECRET,
      }),
    });

    // @ts-ignore - Add types for tokenResponse
    const { access_token, refresh_token, expires_in } = tokenResponse;

    if (!access_token) {
      throw new Error('Failed to retrieve access token from YouTube.');
    }

    // Fetch YouTube channel info
    let channelId = null;
    let channelTitle = null;
    
    try {
      const channelResponse = await $fetch('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'id,snippet',
          mine: 'true',
        },
        headers: { 
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });

      // @ts-ignore - Add types for channelResponse
      if (channelResponse?.items?.length > 0) {
        channelId = channelResponse.items[0].id;
        channelTitle = channelResponse.items[0].snippet.title;
      }
    } catch (channelError) {
      console.error('Error fetching YouTube channel info:', channelError);
    }

    if (!channelId) {
      throw new Error('Failed to retrieve YouTube channel information.');
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Store the YouTube integration data in the database
    await db.insert(youtubeIntegrations).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      accessToken: access_token, // IMPORTANT: Encrypt this token before storing in production!
      refreshToken: refresh_token ?? '', // YouTube OAuth should provide a refresh token when access_type=offline
      channelId: channelId,
      channelTitle: channelTitle ?? '',
      expiresAt: expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: youtubeIntegrations.userId,
      set: {
        accessToken: access_token,
        refreshToken: refresh_token ?? youtubeIntegrations.refreshToken,
        channelId: channelId,
        channelTitle: channelTitle ?? youtubeIntegrations.channelTitle,
        expiresAt: expiresAt,
        updatedAt: new Date(),
      }
    }).execute();

    // Redirect user back to integrations page
    return sendRedirect(event, '/dashboard/integration?youtube_connected=true', 302);

  } catch (error: any) {
    console.error('YouTube callback error:', error);
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to process YouTube callback.',
    });
  }
});
