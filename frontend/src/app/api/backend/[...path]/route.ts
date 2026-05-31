import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { authIsEnabled, SESSION_COOKIE_NAME, sessionIsValid } from "@/lib/auth";
import {
  ServerStoreError,
  createIntakeLead,
  createProspect,
  databaseIsConfigured,
  getIntakeMetrics,
  importIntakeCsv,
  listIntakeDuplicateGroups,
  listIntakeLeads,
  listProspects,
  promoteIntakeLeadToProspect,
  removeProspect,
  updateIntakeLeadStatus,
  updateProspectStatus,
} from "@/lib/server-store";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function externalBackendBaseUrl() {
  const configured = process.env.RUSH_TRACKER_API_BASE_URL;
  if (!configured) {
    return null;
  }
  if (configured.startsWith("http://") || configured.startsWith("https://")) {
    return configured.replace(/\/$/, "");
  }
  return `http://${configured.replace(/\/$/, "")}`;
}

async function jsonBody(request: NextRequest) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function apiError(error: unknown) {
  if (error instanceof ServerStoreError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Request failed.";
  return NextResponse.json({ detail: message }, { status: 500 });
}

async function proxyExternal(request: NextRequest, context: RouteContext, baseUrl: string) {
  const params = await context.params;
  const path = params.path.join("/");
  const incomingUrl = new URL(request.url);
  const targetUrl = `${baseUrl}/${path}${incomingUrl.search}`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  const apiKey = process.env.RUSH_TRACKER_API_KEY;
  if (apiKey) {
    headers.set("x-rush-tracker-api-key", apiKey);
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

async function handle(request: NextRequest, context: RouteContext) {
  const cookieStore = await cookies();
  if (
    authIsEnabled()
    && !sessionIsValid(cookieStore.get(SESSION_COOKIE_NAME)?.value)
  ) {
    return NextResponse.json({ detail: "Login required." }, { status: 401 });
  }

  const externalBaseUrl = externalBackendBaseUrl();
  if (externalBaseUrl) {
    return proxyExternal(request, context, externalBaseUrl);
  }

  if (!databaseIsConfigured()) {
    return NextResponse.json({ detail: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const params = await context.params;
  const [resource, id, action] = params.path;
  const method = request.method;

  try {
    if (method === "GET" && resource === "health") {
      return NextResponse.json({ status: "ok", service: "rush-tracker-web" });
    }
    if (method === "GET" && resource === "prospects" && !id) {
      return NextResponse.json(await listProspects());
    }
    if (method === "POST" && resource === "prospects" && !id) {
      return NextResponse.json(await createProspect(await jsonBody(request)), { status: 201 });
    }
    if (method === "PATCH" && resource === "prospects" && id && action === "status") {
      const body = await jsonBody(request);
      return NextResponse.json(await updateProspectStatus(id, body.status));
    }
    if (method === "POST" && resource === "prospects" && id && action === "remove") {
      const body = await jsonBody(request);
      return NextResponse.json(await removeProspect(id, body.reason));
    }
    if (method === "GET" && resource === "intake-leads" && !id) {
      const status = request.nextUrl.searchParams.get("status");
      return NextResponse.json(await listIntakeLeads(
        status === "needs_review"
        || status === "promoted"
        || status === "rejected"
        || status === "removed"
          ? status
          : undefined,
      ));
    }
    if (method === "POST" && resource === "intake-leads" && !id) {
      return NextResponse.json(await createIntakeLead(await jsonBody(request)), { status: 201 });
    }
    if (method === "PATCH" && resource === "intake-leads" && id && !action) {
      const body = await jsonBody(request);
      return NextResponse.json(await updateIntakeLeadStatus(
        id,
        body.status,
        body.rejection_reason,
      ));
    }
    if (method === "POST" && resource === "intake-leads" && id && action === "promote") {
      return NextResponse.json(await promoteIntakeLeadToProspect(id), { status: 201 });
    }
    if (method === "POST" && resource === "intake-imports" && id === "csv") {
      return NextResponse.json(await importIntakeCsv(await jsonBody(request)), { status: 201 });
    }
    if (method === "GET" && resource === "intake-duplicates" && !id) {
      return NextResponse.json(await listIntakeDuplicateGroups());
    }
    if (method === "GET" && resource === "intake-metrics" && !id) {
      return NextResponse.json(await getIntakeMetrics());
    }

    return NextResponse.json({ detail: "Not found." }, { status: 404 });
  } catch (error) {
    return apiError(error);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
