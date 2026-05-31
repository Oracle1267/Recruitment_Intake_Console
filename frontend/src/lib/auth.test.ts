import { afterEach, describe, expect, it } from "vitest";

import {
  authIsEnabled,
  createSessionToken,
  passwordIsValid,
  sessionIsValid,
} from "./auth";

const originalPassword = process.env.RUSHINTEL_APP_PASSWORD;
const originalSecret = process.env.RUSHINTEL_SESSION_SECRET;

afterEach(() => {
  process.env.RUSHINTEL_APP_PASSWORD = originalPassword;
  process.env.RUSHINTEL_SESSION_SECRET = originalSecret;
});

describe("auth helpers", () => {
  it("stays disabled until a shared password is configured", () => {
    delete process.env.RUSHINTEL_APP_PASSWORD;

    expect(authIsEnabled()).toBe(false);
    expect(passwordIsValid("anything")).toBe(true);
    expect(sessionIsValid(undefined)).toBe(true);
  });

  it("validates the configured shared password", () => {
    process.env.RUSHINTEL_APP_PASSWORD = "chapter-pass";

    expect(authIsEnabled()).toBe(true);
    expect(passwordIsValid("chapter-pass")).toBe(true);
    expect(passwordIsValid("wrong")).toBe(false);
  });

  it("validates signed session tokens", () => {
    process.env.RUSHINTEL_APP_PASSWORD = "chapter-pass";
    process.env.RUSHINTEL_SESSION_SECRET = "session-secret";

    expect(sessionIsValid(createSessionToken())).toBe(true);
    expect(sessionIsValid("not-the-token")).toBe(false);
  });
});
