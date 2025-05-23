import TelegramBot from "node-telegram-bot-api";
import { serverEnv } from "~/env/server";

export const telegramBot = new TelegramBot(serverEnv.TELEGRAM_BOT_TOKEN, {
  polling: false,
});
