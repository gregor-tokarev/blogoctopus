import { serverEnv } from "~/env/server";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { telegramIntegrations } from "~/server/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Helper function to verify Telegram data
function verifyTelegramData(data: any): boolean {
  // Remove the hash from the data to check
  const { hash, ...checkData } = data;
  
  // Sort keys alphabetically and create data check string
  const keys = Object.keys(checkData).sort();
  const dataCheckString = keys.map(key => `${key}=${checkData[key]}`).join('\n');
  
  // Create hash to compare with the one we received
  const secretKey = crypto.createHash('sha256')
    .update(serverEnv.TELEGRAM_BOT_TOKEN)
    .digest();
  
  const hmac = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  return hmac === hash;
}

export default defineEventHandler(async (event) => {
  try {
    // Get the session to identify the user
    const session = await auth.api.getSession(toWebRequest(event));
    if (!session?.user) {
      return sendRedirect(event, '/auth');
    }
    
    // Get query parameters sent by Telegram
    const query = getQuery(event);
    
    // Verify state parameter to prevent CSRF attacks
    const storedState = getCookie(event, 'telegram_oauth_state');
    const receivedState = query.state as string;
    
    // Clear the state cookie
    setCookie(event, 'telegram_oauth_state', '', {
      maxAge: -1,
      path: '/'
    });
    
    if (!storedState || storedState !== receivedState) {
      console.error('Invalid state parameter');
      return sendRedirect(event, '/dashboard/integration?error=invalid_state');
    }
    
    // Verify the data integrity from Telegram
    if (!verifyTelegramData(query)) {
      console.error('Invalid Telegram auth data');
      return sendRedirect(event, '/dashboard/integration?error=invalid_data');
    }
    
    // Extract user data from Telegram
    const userId = session.user.id;
    const telegramData = {
      id: query.id as string,
      first_name: query.first_name as string,
      username: query.username as string || null,
      photo_url: query.photo_url as string || null,
      auth_date: parseInt(query.auth_date as string) || Math.floor(Date.now() / 1000),
    };
    
    // Check if there's an existing integration for this user
    const existingIntegration = await db.query.telegramIntegrations.findFirst({
      where: eq(telegramIntegrations.userId, userId)
    });
    
    // Save the integration data
    if (existingIntegration) {
      // Update existing integration
      await db
        .update(telegramIntegrations)
        .set({
          accessToken: JSON.stringify(telegramData),
          botChatId: telegramData.id,
          channelUsername: telegramData.username,
          authDate: new Date(telegramData.auth_date * 1000),
          updatedAt: new Date()
        })
        .where(eq(telegramIntegrations.id, existingIntegration.id));
    } else {
      // Create new integration
      await db.insert(telegramIntegrations).values({
        id: crypto.randomUUID(),
        userId,
        accessToken: JSON.stringify(telegramData),
        botChatId: telegramData.id,
        channelUsername: telegramData.username,
        authDate: new Date(telegramData.auth_date * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Return HTML that will close the popup and notify the parent window
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Telegram Integration</title>
          <script>
            window.onload = function() {
              window.opener.postMessage('telegram-auth-success', '*');
              window.close();
            };
          </script>
        </head>
        <body>
          <p>Авторизация успешна! Вы можете закрыть это окно.</p>
        </body>
      </html>
    `;
    
  } catch (error) {
    console.error('Error processing Telegram callback:', error);
    return sendRedirect(event, '/dashboard/integration?error=server_error');
  }
});
