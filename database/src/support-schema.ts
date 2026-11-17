import { index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { companies, users } from "./schema.js";

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    category: text("category").default("GENERAL").notNull(),
    priority: text("priority").default("NORMAL").notNull(),
    status: text("status").default("OPEN").notNull(),
    adminReply: text("admin_reply"),
    repliedBy: uuid("replied_by").references(() => users.id, { onDelete: "set null" }),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("support_messages_company_id_id_uq").on(t.companyId, t.id),
    index("support_messages_company_status_idx").on(t.companyId, t.status),
    index("support_messages_company_user_idx").on(t.companyId, t.userId),
    index("support_messages_company_created_idx").on(t.companyId, t.createdAt),
  ],
);
