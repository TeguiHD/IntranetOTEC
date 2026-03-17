import assert from "node:assert/strict";
import test from "node:test";

import { logEvent } from "../src/lib/observability/logger";

test("logEvent redacts sensitive fields and masks userId", () => {
  let capturedLine = "";
  const originalInfo = console.info;

  console.info = (line?: unknown) => {
    capturedLine = String(line ?? "");
  };

  try {
    logEvent({
      correlationId: "cid-123",
      action: "test_action",
      result: "success",
      endpoint: "/test",
      userId: "1234567890abcdef",
      role: "admin",
      details: {
        password: "supersecret",
        token: "jwt-token",
        email: "persona@example.com",
      },
    });
  } finally {
    console.info = originalInfo;
  }

  assert.ok(capturedLine.length > 0);
  const parsed = JSON.parse(capturedLine) as {
    userId: string;
    details: {
      password: string;
      token: string;
      email: string;
    };
  };

  assert.equal(parsed.userId, "123456...cdef");
  assert.equal(parsed.details.password, "***REDACTED***");
  assert.equal(parsed.details.token, "***REDACTED***");
  assert.equal(parsed.details.email, "pe***@example.com");
});
