import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "rush_tracker_session";

const SESSION_PURPOSE = "rush-tracker-app-session-v1";

function configuredPassword() {
  return (
    process.env.RUSH_TRACKER_APP_PASSWORD
    || ""
  ).trim();
}

function sessionSecret() {
  return (
    process.env.RUSH_TRACKER_SESSION_SECRET
    || configuredPassword()
  ).trim();
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function authIsEnabled() {
  return configuredPassword().length > 0;
}

export function createSessionToken() {
  return createHmac("sha256", sessionSecret())
    .update(SESSION_PURPOSE)
    .digest("hex");
}

export function passwordIsValid(password: string) {
  const expected = configuredPassword();
  if (!expected) {
    return true;
  }
  return safeCompare(password, expected);
}

export function sessionIsValid(token: string | undefined) {
  if (!authIsEnabled()) {
    return true;
  }
  if (!token) {
    return false;
  }
  return safeCompare(token, createSessionToken());
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  };
}
