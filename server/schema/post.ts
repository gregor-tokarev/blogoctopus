import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { linkedinIntegrations } from "./linkedin";
import { telegramIntegrations } from "./telegram";

export const posts = pgTable(
  "post", 
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    contentTsv: text("content_tsv").notNull().$type<string>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    linkedinIntegrationId: text("linkedin_integration_id")
      .references(() => linkedinIntegrations.id),
    telegramIntegrationId: text("telegram_integration_id")
      .references(() => telegramIntegrations.id),
    scheduledAt: timestamp("scheduled_at"),
  },
  (table) => {
    return {
      contentTsvIdx: index("content_tsv_idx").on(table.contentTsv),
    };
  }
);