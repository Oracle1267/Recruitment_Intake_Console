import { afterEach, describe, expect, it } from "vitest";

import {
  authIsEnabled,
  createSessionToken,
  passwordIsValid,
  sessionIsValid,
} from "./auth";

const originalPassword = process.env.RUSH_TRACKER_APP_PASSWORD;
const originalSecret = process.env.RUSH_TRACKER_SESSION_SECRET;

afterEach(() => {
  process.env.RUSH_TRACKER_APP_PASSWORD = originalPassword;
  process.env.RUSH_TRACKER_SESSION_SECRET = originalSecret;
});

describe("auth helpers", () => {
  it("stays disabled until a shared password is configured", () => {
    delete process.env.RUSH_TRACKER_APP_PASSWORD;

    expect(authIsEnabled()).toBe(false);
    expect(passwordIsValid("anything")).toBe(true);
    expect(sessionIsValid(undefined)).toBe(true);
  });

  it("validates the configured shared password", () => {
    process.env.RUSH_TRACKER_APP_PASSWORD = "chapter-pass";

    expect(authIsEnabled()).toBe(true);
    expect(passwordIsValid("chapter-pass")).toBe(true);
    expect(passwordIsValid("wrong")).toBe(false);
  });

  it("validates signed session tokens", () => {
    process.env.RUSH_TRACKER_APP_PASSWORD = "chapter-pass";
    process.env.RUSH_TRACKER_SESSION_SECRET = "session-secret";

    expect(sessionIsValid(createSessionToken())).toBe(true);
    expect(sessionIsValid("not-the-token")).toBe(false);
  });
});
