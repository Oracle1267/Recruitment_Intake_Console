import { NextRequest, NextResponse } from "next/server";

import {
  createSessionToken,
  passwordIsValid,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  if (!passwordIsValid(password)) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(), sessionCookieOptions());
  return response;
}
