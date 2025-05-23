import { auth } from "~/server/lib/better-auth";
import { db } from "~/server/lib/db";
import { telegramBot } from "~/server/lib/telegram";
import { telegramIntegrations } from "~/server/schema";
import { sendPostSchema } from "~/lib/network-contracts/telegram";

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, sendPostSchema.safeParse);
  if (!body.success) {
    throw createError({
      statusCode: 400,
      message: "Invalid request body",
    });
  }

  const session = await auth.api.getSession(toWebRequest(event));
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  const { channelName } = body.data;

  const normalizedChannelName = channelName.startsWith("@")
    ? channelName
    : `@${channelName}`;

  try {
    await telegramBot.getChatMemberCount(normalizedChannelName); // failing if channel doesn't exist or bot is not attached to the channel
  } catch (err) {
    console.error("Error connecting to Telegram channel:", err);
    throw createError({
      statusCode: 400,
      message: "Канал Telegram не найден или бот не подключен к нему",
    });
  }

  await db
    .insert(telegramIntegrations)
    .values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      channelUsername: normalizedChannelName,
      botChatId: await telegramBot.getMe().then((res) => res.id.toString()),
      authDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .execute();

  return {
    success: true,
    message: "Канал Telegram успешно подключен",
  };
});
