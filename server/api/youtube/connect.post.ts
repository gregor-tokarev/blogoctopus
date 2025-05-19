import { auth } from "~/server/lib/better-auth";
import { youtubeConnectResponseSchema } from "~/lib/network-contracts/youtube";
import { serverEnv } from "~/env/server"; 

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  if (!serverEnv.YOUTUBE_CLIENT_ID || !serverEnv.YOUTUBE_REDIRECT_URI) {
    console.error("YouTube Client ID or Redirect URI not configured.");
    throw createError({
      statusCode: 500,
      message: "YouTube integration not configured correctly on the server.",
    });
  }

  const scope = encodeURIComponent("https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl");
  const state = crypto.randomUUID(); 

  // TODO: Store state in session or a temporary store to verify it in the callback for CSRF protection

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${serverEnv.YOUTUBE_CLIENT_ID}&redirect_uri=${encodeURIComponent(serverEnv.YOUTUBE_REDIRECT_URI)}&state=${state}&scope=${scope}&access_type=offline&prompt=consent`;

  return youtubeConnectResponseSchema.parse({
    success: true,
    authUrl: authUrl,
  });
});
