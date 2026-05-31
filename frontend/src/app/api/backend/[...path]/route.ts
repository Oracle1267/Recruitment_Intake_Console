import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { authIsEnabled, SESSION_COOKIE_NAME, sessionIsValid } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function backendBaseUrl() {
  const configured = process.env.RUSHINTEL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!configured) {
    return null;
  }
  if (configured.startsWith("http://") || configured.startsWith("https://")) {
    return configured.replace(/\/$/, "");
  }
  return `http://${configured.replace(/\/$/, "")}`;
}

async function proxy(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  if (
    authIsEnabled()
    && !sessionIsValid(cookieStore.get(SESSION_COOKIE_NAME)?.value)
  ) {
    return NextResponse.json({ detail: "Login required." }, { status: 401 });
  }

  const baseUrl = backendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ detail: "Backend API URL is not configured." }, { status: 503 });
  }

  const params = await context.params;
  const path = params.path.join("/");
  const incomingUrl = new URL(request.url);
  const targetUrl = `${baseUrl}/${path}${incomingUrl.search}`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const apiKey = process.env.RUSHINTEL_API_KEY;
  if (apiKey) {
    headers.set("x-rushintel-api-key", apiKey);
  }

  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.text();

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });
  const responseBody = await response.arrayBuffer();
  return new NextResponse(responseBody, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
