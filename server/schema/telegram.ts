import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Schema for storing Telegram integration data
export const telegramIntegrations = pgTable("telegram_integrations", {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  botChatId: text('bot_chat_id'), // Store the chat ID for sending messages
  channelUsername: text('channel_username'), // Optional: store channel username if connected
  authDate: timestamp('auth_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
