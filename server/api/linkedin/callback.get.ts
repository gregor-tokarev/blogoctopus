import { auth } from "~/server/lib/better-auth";
import { db } from "~/server/lib/db";
import { linkedinIntegrations } from "~/server/schema";
import { linkedinCallbackRequestSchema } from "~/lib/network-contracts/linkedin";
import { serverEnv } from "~/env/server";

// IMPORTANT: This is a simplified callback handler.
// In a production app, you MUST: 
// 1. Verify the 'state' parameter to prevent CSRF attacks.
// 2. Handle errors from LinkedIn more robustly.
// 3. Securely store access tokens (e.g., encrypted in the database).

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const parsedQuery = linkedinCallbackRequestSchema.safeParse(query);

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      message: "Invalid callback parameters",
      data: parsedQuery.error.issues,
    });
  }

  const { code, state } = parsedQuery.data;

  // TODO: Retrieve and verify the 'state' stored in the session/temporary store
  // const storedState = await event.context.session.get('linkedinOauthState');
  // if (!state || state !== storedState) {
  //   throw createError({
  //     statusCode: 400,
  //     message: "Invalid state parameter. CSRF attack suspected.",
  //   });
  // }
  // await event.context.session.unset('linkedinOauthState'); // Clear the state

  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    // This should ideally not happen if the flow started with an authenticated user,
    // but good to have a check.
    throw createError({
      statusCode: 401,
      message: "User not authenticated during callback",
    });
  }

  try {
    const tokenResponse = await $fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: serverEnv.LINKEDIN_REDIRECT_URI,
        client_id: serverEnv.LINKEDIN_CLIENT_ID,
        client_secret: serverEnv.LINKEDIN_CLIENT_SECRET,
      }),
    });

    // @ts-ignore TODO: Add type for tokenResponse
    const { access_token, expires_in } = tokenResponse;

    if (!access_token) {
      throw new Error('Failed to retrieve access token from LinkedIn.');
    }

    // TODO: Optionally, fetch basic profile info using the access_token to get linkedinProfileId
    // const profileResponse = await $fetch('https://api.linkedin.com/v2/me', {
    //   headers: { 'Authorization': `Bearer ${access_token}` },
    // });
    // const linkedinProfileId = profileResponse.id;

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await db.insert(linkedinIntegrations).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      accessToken: access_token, // IMPORTANT: Encrypt this token before storing in production!
      expiresAt: expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: linkedinIntegrations.userId, // Assuming one LinkedIn integration per user
      set: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
        // linkedinProfileId: linkedinProfileId, // If fetched
        updatedAt: new Date(),
      }
    }).execute();

    // Redirect user to a success page or back to the integrations page
    // For an API, you might just return a success message.
    // This example redirects to the integrations dashboard page.
    return sendRedirect(event, '/dashboard/integration?linkedin_connected=true', 302);

  } catch (error: any) {
    console.error('LinkedIn callback error:', error);
    // You might want to redirect to an error page or return a JSON error
    // return sendRedirect(event, '/dashboard/integration?linkedin_error=true', 302);
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to process LinkedIn callback.',
      // data: error.data // if error is from $fetch and has response data
    });
  }
});
