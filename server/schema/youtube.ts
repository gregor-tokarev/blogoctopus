import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Schema for storing YouTube integration data
export const youtubeIntegrations = pgTable("youtube_integrations", {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }).unique(),
  accessToken: text('access_token').notNull(), // Store the YouTube API access token
  refreshToken: text('refresh_token').notNull(), // Store the YouTube API refresh token
  channelId: text('channel_id').notNull(), // YouTube channel ID for API calls
  channelTitle: text('channel_title'), // YouTube channel title (optional)
  expiresAt: timestamp('expires_at').notNull(), // Store the expiry date of the access token
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
