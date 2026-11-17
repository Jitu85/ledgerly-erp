import { describe, expect, it } from "vitest";
import {
  replySupportMessageSchema,
  sendSupportMessageSchema,
  updateSupportMessageStatusSchema,
} from "@erp/types";

describe("Support & Messaging Engine", () => {
  it("validates incoming support messages and applies defaults", () => {
    const valid = sendSupportMessageSchema.parse({
      subject: "Cannot login after password reset",
      message: "I am receiving an invalid credentials error when attempting to login.",
    });

    expect(valid.subject).toBe("Cannot login after password reset");
    expect(valid.category).toBe("GENERAL");
    expect(valid.priority).toBe("NORMAL");

    const withOptions = sendSupportMessageSchema.parse({
      subject: "Urgent: payment processing failure",
      message: "Stripe webhook failed to post invoice journal entry.",
      category: "BILLING",
      priority: "URGENT",
    });

    expect(withOptions.category).toBe("BILLING");
    expect(withOptions.priority).toBe("URGENT");
  });

  it("rejects messages with subjects that are too short", () => {
    const result = sendSupportMessageSchema.safeParse({
      subject: "No",
      message: "This is a detailed message explaining my issue with the platform.",
    });
    expect(result.success).toBe(false);
  });

  it("validates admin reply and status transitions", () => {
    const validReply = replySupportMessageSchema.parse({
      reply: "Your account was unlocked and a temporary password was generated.",
      status: "RESOLVED",
    });
    expect(validReply.status).toBe("RESOLVED");

    const validStatus = updateSupportMessageStatusSchema.parse({
      status: "IN_PROGRESS",
    });
    expect(validStatus.status).toBe("IN_PROGRESS");
  });
});
