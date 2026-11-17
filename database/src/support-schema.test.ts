import { describe, expect, it } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { supportMessages } from "./support-schema.js";

describe("Support Messages Database Schema", () => {
  it("defines support_messages table with tenant isolation and required fields", () => {
    const columns = getTableColumns(supportMessages);
    expect(columns.id).toBeDefined();
    expect(columns.companyId).toBeDefined();
    expect(columns.userId).toBeDefined();
    expect(columns.subject).toBeDefined();
    expect(columns.message).toBeDefined();
    expect(columns.category).toBeDefined();
    expect(columns.priority).toBeDefined();
    expect(columns.status).toBeDefined();
    expect(columns.adminReply).toBeDefined();
    expect(columns.repliedBy).toBeDefined();
    expect(columns.repliedAt).toBeDefined();
    expect(columns.createdAt).toBeDefined();
  });
});
