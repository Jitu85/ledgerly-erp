import { describe, expect, it } from "vitest";
import { queueNames } from "./queue-names";

describe("queue names", () => {
  it("are stable and do not include business-module queues prematurely", () => {
    expect(Object.values(queueNames)).toEqual([
      "audit-delivery",
      "email-delivery",
      "foundation-maintenance",
    ]);
  });
});
