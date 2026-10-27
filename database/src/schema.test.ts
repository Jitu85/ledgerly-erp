import { describe, expect, it } from "vitest";
import { getTableName } from "drizzle-orm";
import {
  auditLogs,
  companies,
  companyUsers,
  permissions,
  rolePermissions,
  roles,
  users,
} from "./schema.js";

describe("foundation schema", () => {
  it("uses the phase-required identity table names", () => {
    expect(getTableName(users)).toBe("users");
    expect(getTableName(companyUsers)).toBe("company_users");
  });

  it("keeps tenant authorization tables distinct from global permissions", () => {
    expect(getTableName(companies)).toBe("companies");
    expect(getTableName(roles)).toBe("roles");
    expect(getTableName(permissions)).toBe("permissions");
    expect(getTableName(rolePermissions)).toBe("role_permissions");
    expect(getTableName(auditLogs)).toBe("audit_logs");
  });
});
