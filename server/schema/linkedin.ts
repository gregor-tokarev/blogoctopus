import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Schema for storing LinkedIn integration data
export const linkedinIntegrations = pgTable("linkedin_integrations", {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }).unique(),
  accessToken: text('access_token').notNull(), // Store the LinkedIn API access token
  profileId: text('profile_id').notNull(), // LinkedIn profile ID for API calls
  expiresAt: timestamp('expires_at').notNull(), // Store the expiry date of the access token
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
