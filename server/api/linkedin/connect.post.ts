import { auth } from "~/server/lib/better-auth";
import { linkedinConnectResponseSchema } from "~/lib/network-contracts/linkedin";
import { serverEnv } from "~/env/server"; 

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  if (!serverEnv.LINKEDIN_CLIENT_ID || !serverEnv.LINKEDIN_REDIRECT_URI) {
    console.error("LinkedIn Client ID or Redirect URI not configured.");
      throw createError({
      statusCode: 500,
      message: "LinkedIn integration not configured correctly on the server.",
    });
  }

  const scope = encodeURIComponent("w_member_social openid profile"); 
  const state = crypto.randomUUID(); 

  // TODO: Store state in session or a temporary store to verify it in the callback for CSRF protection
  // Example: await event.context.session.set('linkedinOauthState', state); 

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${serverEnv.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(serverEnv.LINKEDIN_REDIRECT_URI)}&state=${state}&scope=${scope}`;

  return linkedinConnectResponseSchema.parse({
    success: true,
    authUrl: authUrl,
  });
});
