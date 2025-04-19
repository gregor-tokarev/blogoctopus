import { serverEnv } from "~/env/server";
import { auth } from "~/server/better-auth";
import crypto from 'crypto';

export default defineEventHandler(async (event) => {
  // Get session and check authentication
  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized"
    });
  }

  try {
    // Generate a state parameter to prevent CSRF attacks
    const state = crypto.randomUUID();
    
    // Store it in a cookie for verification later
    setCookie(event, 'telegram_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/'
    });

    // Create the Telegram Bot authentication URL
    // Note: Make sure to add these env variables to your project
    const telegramBotToken = serverEnv.TELEGRAM_BOT_TOKEN;
    const botUsername = telegramBotToken.split(':')[0]; // Extract bot username from token
    
    // Construct the auth URL (Telegram Login Widget approach)
    const appUrl = serverEnv.APP_URL || `https://${getRequestHost(event)}`;
    const redirectUrl = `${appUrl}/api/telegram/callback`;
    
    // Create a data check string and its hash for verification
    // This is used by Telegram's login widget to verify data integrity
    const dataCheckString = `auth_date=${Math.floor(Date.now() / 1000)}\nid=${session.user.id}\nfirst_name=${session.user.name || 'User'}\nusername=${session.user.email.split('@')[0]}`;
    
    const secretKey = crypto.createHash('sha256')
      .update(telegramBotToken)
      .digest();
      
    const hash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Construct the Telegram login widget URL
    const authUrl = `https://oauth.telegram.org/auth?bot_id=${botUsername}&origin=${encodeURIComponent(appUrl)}&return_to=${encodeURIComponent(redirectUrl)}&request_access=write&state=${state}&hash=${hash}`;
    
    return { url: authUrl };
  } catch (error) {
    console.error('Error generating Telegram auth URL:', error);
    throw createError({
      statusCode: 500,
      message: "Failed to generate Telegram authentication URL"
    });
  }
});
