import { randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";

import type {
  ApiIntakeCsvImportResult,
  ApiIntakeDuplicateGroup,
  ApiIntakeLead,
  ApiIntakeMetrics,
  IntakeLeadStatus,
  IntakeSourceType,
} from "@/lib/intake";
import type {
  ApiProspect,
  CollectionMethod,
  RecruitmentStatus,
} from "@/lib/prospects";

type DbRow = Record<string, unknown>;

type CreateProspectInput = {
  first_name?: unknown;
  last_name?: unknown;
  preferred_name?: unknown;
  hometown?: unknown;
  high_school?: unknown;
  major?: unknown;
  source_platform?: unknown;
  primary_handle?: unknown;
  source_url?: unknown;
  collection_method?: unknown;
  permission_confirmed?: unknown;
  interests?: unknown;
  notes?: unknown;
  rush_score?: unknown;
  status?: unknown;
};

type CreateIntakeLeadInput = {
  first_name?: unknown;
  last_name?: unknown;
  preferred_name?: unknown;
  primary_handle?: unknown;
  phone?: unknown;
  email?: unknown;
  hometown?: unknown;
  high_school?: unknown;
  interests?: unknown;
  source_type?: unknown;
  source_label?: unknown;
  referred_by?: unknown;
  event_name?: unknown;
  evidence?: unknown;
  notes?: unknown;
};

const intakeSourceTypes = [
  "member_referral",
  "opt_in",
  "event_check_in",
  "csv_import",
  "manual_entry",
] as const satisfies IntakeSourceType[];

const intakeLeadStatuses = [
  "needs_review",
  "promoted",
  "rejected",
  "removed",
] as const satisfies IntakeLeadStatus[];

const recruitmentStatuses = [
  "identified",
  "researched",
  "initial_contact",
  "engaged",
  "event_attended",
  "strong_interest",
  "bid_offered",
  "accepted",
  "declined",
  "lost_contact",
  "not_applicable",
] as const satisfies RecruitmentStatus[];

const collectionMethods = [
  "manual",
  "assisted",
] as const satisfies CollectionMethod[];

let schemaReady: Promise<void> | null = null;

export class ServerStoreError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ServerStoreError";
  }
}

export function databaseIsConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function sql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new ServerStoreError("DATABASE_URL is not configured.", 503);
  }
  return neon(databaseUrl);
}

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = createSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

async function createSchema() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS prospects (
      id text PRIMARY KEY,
      first_name text NOT NULL,
      last_name text,
      preferred_name text,
      hometown text,
      high_school text,
      major text,
      rush_score integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'identified',
      interests jsonb NOT NULL DEFAULT '[]'::jsonb,
      notes text,
      source_platform text NOT NULL,
      primary_handle text,
      normalized_handle text,
      source_url text,
      collection_method text NOT NULL DEFAULT 'manual',
      public_information_confirmed boolean NOT NULL,
      suppressed boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS prospect_notes (
      id text PRIMARY KEY,
      prospect_id text NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
      author text NOT NULL,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS follow_up_tasks (
      id text PRIMARY KEY,
      prospect_id text NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
      owner text NOT NULL,
      due_date date NOT NULL,
      reason text NOT NULL,
      completed boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS suppression_entries (
      id text PRIMARY KEY,
      platform text NOT NULL,
      normalized_platform text NOT NULL,
      handle text NOT NULL,
      normalized_handle text NOT NULL,
      reason text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS intake_leads (
      id text PRIMARY KEY,
      first_name text NOT NULL,
      last_name text,
      preferred_name text,
      primary_handle text,
      normalized_handle text,
      phone text,
      email text,
      normalized_email text,
      hometown text,
      high_school text,
      interests jsonb NOT NULL DEFAULT '[]'::jsonb,
      source_type text NOT NULL,
      source_label text NOT NULL,
      referred_by text,
      event_name text,
      evidence text NOT NULL,
      notes text,
      status text NOT NULL DEFAULT 'needs_review',
      rejection_reason text,
      promoted_prospect_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS prospects_created_at_idx ON prospects(created_at)`;
  await db`CREATE INDEX IF NOT EXISTS intake_leads_created_at_idx ON intake_leads(created_at)`;
  await db`CREATE INDEX IF NOT EXISTS intake_leads_identity_idx ON intake_leads(normalized_handle, normalized_email)`;
  await db`CREATE INDEX IF NOT EXISTS suppression_identity_idx ON suppression_entries(normalized_platform, normalized_handle)`;
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredString(value: unknown, fieldName: string, maxLength?: number) {
  const cleaned = cleanString(value);
  if (!cleaned) {
    throw new ServerStoreError(`${fieldName} is required.`);
  }
  if (maxLength && cleaned.length > maxLength) {
    throw new ServerStoreError(`${fieldName} is too long.`);
  }
  return cleaned;
}

function normalizeIdentity(value: unknown) {
  const cleaned = cleanString(value);
  if (!cleaned) {
    return null;
  }
  const withoutAt = cleaned.startsWith("@") ? cleaned.slice(1) : cleaned;
  return withoutAt.trim().toLowerCase() || null;
}

function normalizeEmail(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned ? cleaned.toLowerCase() : null;
}

function normalizeDisplayName(value: string) {
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ") || null;
}

function normalizePlatform(value: string) {
  return value.trim().toLowerCase();
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanString(item))
      .filter((item): item is string => Boolean(item));
  }
  const single = cleanString(value);
  return single
    ? single.split(",").map((item) => item.trim()).filter(Boolean)
    : [];
}

function jsonArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isoDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) {
      return date.toISOString();
    }
  }
  return new Date().toISOString();
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fieldName: string,
  fallback?: T[number],
) {
  if (typeof value === "string" && allowed.includes(value)) {
    return value as T[number];
  }
  if (fallback) {
    return fallback;
  }
  throw new ServerStoreError(`${fieldName} is invalid.`);
}

function rushScore(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function truthy(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["true", "1", "yes", "y"].includes(value.toLowerCase());
  }
  return Boolean(value);
}

function mapProspectRow(row: DbRow): ApiProspect {
  return {
    id: String(row.id),
    first_name: String(row.first_name),
    last_name: cleanString(row.last_name),
    preferred_name: cleanString(row.preferred_name),
    source_platform: String(row.source_platform),
    primary_handle: cleanString(row.primary_handle),
    source_url: cleanString(row.source_url),
    collection_method: enumValue(
      row.collection_method,
      collectionMethods,
      "collection_method",
      "manual",
    ),
    permission_confirmed: Boolean(row.permission_confirmed),
    status: enumValue(row.status, recruitmentStatuses, "status", "identified"),
    rush_score: Number(row.rush_score ?? 0),
    interests: jsonArray(row.interests),
  };
}

function mapIntakeLeadRow(row: DbRow): ApiIntakeLead {
  return {
    id: String(row.id),
    first_name: String(row.first_name),
    last_name: cleanString(row.last_name),
    preferred_name: cleanString(row.preferred_name),
    primary_handle: cleanString(row.primary_handle),
    phone: cleanString(row.phone),
    email: cleanString(row.email),
    hometown: cleanString(row.hometown),
    high_school: cleanString(row.high_school),
    interests: jsonArray(row.interests),
    source_type: enumValue(row.source_type, intakeSourceTypes, "source_type", "manual_entry"),
    source_label: String(row.source_label),
    referred_by: cleanString(row.referred_by),
    event_name: cleanString(row.event_name),
    evidence: String(row.evidence),
    notes: cleanString(row.notes),
    status: enumValue(row.status, intakeLeadStatuses, "status", "needs_review"),
    rejection_reason: cleanString(row.rejection_reason),
    promoted_prospect_id: cleanString(row.promoted_prospect_id),
    created_at: isoDate(row.created_at),
    updated_at: isoDate(row.updated_at),
  };
}

async function ensureNotSuppressed(platform: string, handle: unknown) {
  const normalizedHandle = normalizeIdentity(handle);
  if (!normalizedHandle) {
    return;
  }
  const db = sql();
  const rows = await db`
    SELECT id
    FROM suppression_entries
    WHERE normalized_platform = ${normalizePlatform(platform)}
      AND normalized_handle = ${normalizedHandle}
    LIMIT 1
  `;
  if (rows.length > 0) {
    throw new ServerStoreError("Prospect matches the suppression list.");
  }
}

export async function listProspects(): Promise<ApiProspect[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT
      id,
      first_name,
      last_name,
      preferred_name,
      source_platform,
      primary_handle,
      source_url,
      collection_method,
      public_information_confirmed AS permission_confirmed,
      status,
      rush_score,
      interests
    FROM prospects
    ORDER BY created_at ASC, first_name ASC
  `;
  return rows.map(mapProspectRow);
}

export async function createProspect(input: CreateProspectInput): Promise<ApiProspect> {
  await ensureSchema();
  const firstName = requiredString(input.first_name, "first_name", 80);
  const sourcePlatform = requiredString(input.source_platform, "source_platform", 80);
  if (!truthy(input.permission_confirmed)) {
    throw new ServerStoreError("Prospect collection must be confirmed as permitted.");
  }
  await ensureNotSuppressed(sourcePlatform, input.primary_handle);

  const db = sql();
  const rows = await db`
    INSERT INTO prospects (
      id,
      first_name,
      last_name,
      preferred_name,
      hometown,
      high_school,
      major,
      rush_score,
      status,
      interests,
      notes,
      source_platform,
      primary_handle,
      normalized_handle,
      source_url,
      collection_method,
      public_information_confirmed
    )
    VALUES (
      ${randomUUID()},
      ${firstName},
      ${cleanString(input.last_name)},
      ${cleanString(input.preferred_name)},
      ${cleanString(input.hometown)},
      ${cleanString(input.high_school)},
      ${cleanString(input.major)},
      ${rushScore(input.rush_score)},
      ${enumValue(input.status, recruitmentStatuses, "status", "identified")},
      ${JSON.stringify(stringArray(input.interests))}::jsonb,
      ${cleanString(input.notes)},
      ${sourcePlatform},
      ${cleanString(input.primary_handle)},
      ${normalizeIdentity(input.primary_handle)},
      ${cleanString(input.source_url)},
      ${enumValue(input.collection_method, collectionMethods, "collection_method", "manual")},
      true
    )
    RETURNING
      id,
      first_name,
      last_name,
      preferred_name,
      source_platform,
      primary_handle,
      source_url,
      collection_method,
      public_information_confirmed AS permission_confirmed,
      status,
      rush_score,
      interests
  `;
  return mapProspectRow(rows[0]);
}

export async function updateProspectStatus(
  prospectId: string,
  status: unknown,
): Promise<ApiProspect> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    UPDATE prospects
    SET status = ${enumValue(status, recruitmentStatuses, "status")},
      updated_at = now()
    WHERE id = ${prospectId}
    RETURNING
      id,
      first_name,
      last_name,
      preferred_name,
      source_platform,
      primary_handle,
      source_url,
      collection_method,
      public_information_confirmed AS permission_confirmed,
      status,
      rush_score,
      interests
  `;
  if (rows.length === 0) {
    throw new ServerStoreError("Prospect not found.", 404);
  }
  return mapProspectRow(rows[0]);
}

export async function removeProspect(
  prospectId: string,
  reason: unknown,
): Promise<ApiProspect> {
  await ensureSchema();
  const removalReason = requiredString(reason, "reason", 500);
  const removalNote = `Removed as not applicable: ${removalReason}`;
  const db = sql();
  const rows = await db`
    UPDATE prospects
    SET status = 'not_applicable',
      notes = CASE
        WHEN notes IS NULL OR notes = '' THEN ${removalNote}
        ELSE notes || E'\n\n' || ${removalNote}
      END,
      updated_at = now()
    WHERE id = ${prospectId}
    RETURNING
      id,
      first_name,
      last_name,
      preferred_name,
      source_platform,
      primary_handle,
      source_url,
      collection_method,
      public_information_confirmed AS permission_confirmed,
      status,
      rush_score,
      interests
  `;
  if (rows.length === 0) {
    throw new ServerStoreError("Prospect not found.", 404);
  }
  return mapProspectRow(rows[0]);
}

export async function createIntakeLead(input: CreateIntakeLeadInput): Promise<ApiIntakeLead> {
  await ensureSchema();
  const firstName = requiredString(input.first_name, "first_name", 80);
  const sourceType = enumValue(input.source_type, intakeSourceTypes, "source_type");
  const sourceLabel = requiredString(input.source_label, "source_label", 160);
  const evidence = requiredString(input.evidence, "evidence", 1000);
  const db = sql();
  const rows = await db`
    INSERT INTO intake_leads (
      id,
      first_name,
      last_name,
      preferred_name,
      primary_handle,
      normalized_handle,
      phone,
      email,
      normalized_email,
      hometown,
      high_school,
      interests,
      source_type,
      source_label,
      referred_by,
      event_name,
      evidence,
      notes
    )
    VALUES (
      ${randomUUID()},
      ${firstName},
      ${cleanString(input.last_name)},
      ${cleanString(input.preferred_name)},
      ${cleanString(input.primary_handle)},
      ${normalizeIdentity(input.primary_handle)},
      ${cleanString(input.phone)},
      ${cleanString(input.email)},
      ${normalizeEmail(input.email)},
      ${cleanString(input.hometown)},
      ${cleanString(input.high_school)},
      ${JSON.stringify(stringArray(input.interests))}::jsonb,
      ${sourceType},
      ${sourceLabel},
      ${cleanString(input.referred_by)},
      ${cleanString(input.event_name)},
      ${evidence},
      ${cleanString(input.notes)}
    )
    RETURNING *
  `;
  return mapIntakeLeadRow(rows[0]);
}

export async function listIntakeLeads(
  status?: IntakeLeadStatus,
): Promise<ApiIntakeLead[]> {
  await ensureSchema();
  const db = sql();
  const rows = status
    ? await db`
        SELECT *
        FROM intake_leads
        WHERE status = ${status}
        ORDER BY created_at DESC, first_name ASC
      `
    : await db`
        SELECT *
        FROM intake_leads
        ORDER BY created_at DESC, first_name ASC
      `;
  return rows.map(mapIntakeLeadRow);
}

export async function updateIntakeLeadStatus(
  leadId: string,
  status: unknown,
  rejectionReason: unknown,
): Promise<ApiIntakeLead> {
  await ensureSchema();
  const nextStatus = enumValue(status, intakeLeadStatuses, "status");
  if (nextStatus === "promoted") {
    throw new ServerStoreError("Use the promote endpoint to promote an intake lead.");
  }
  if ((nextStatus === "rejected" || nextStatus === "removed") && !cleanString(rejectionReason)) {
    throw new ServerStoreError("This status requires a reason.");
  }
  const db = sql();
  const rows = await db`
    UPDATE intake_leads
    SET status = ${nextStatus},
      rejection_reason = ${cleanString(rejectionReason)},
      updated_at = now()
    WHERE id = ${leadId}
    RETURNING *
  `;
  if (rows.length === 0) {
    throw new ServerStoreError("Intake lead not found.", 404);
  }
  return mapIntakeLeadRow(rows[0]);
}

function intakeIdentityKey(lead: ApiIntakeLead) {
  const handle = normalizeIdentity(lead.primary_handle);
  if (handle) {
    return `handle:${handle}`;
  }
  const email = normalizeEmail(lead.email);
  if (email) {
    return `email:${email}`;
  }
  const displayName = normalizeDisplayName(`${lead.first_name} ${lead.last_name || ""}`);
  return displayName ? `name:${displayName}` : null;
}

function intakeIdentityLabel(lead: ApiIntakeLead) {
  return lead.primary_handle || lead.email || `${lead.first_name} ${lead.last_name || ""}`.trim();
}

export async function listIntakeDuplicateGroups(): Promise<ApiIntakeDuplicateGroup[]> {
  await ensureSchema();
  const db = sql();
  const rows = await db`
    SELECT *
    FROM intake_leads
    ORDER BY created_at ASC, first_name ASC
  `;
  const groups = new Map<string, ApiIntakeLead[]>();
  for (const row of rows) {
    const lead = mapIntakeLeadRow(row);
    const key = intakeIdentityKey(lead);
    if (key) {
      groups.set(key, [...(groups.get(key) || []), lead]);
    }
  }

  return [...groups.entries()]
    .filter(([, leads]) => leads.length > 1)
    .map(([identityKey, leads]) => ({
      identity_key: identityKey,
      label: intakeIdentityLabel(leads[0]),
      count: leads.length,
      statuses: [...new Set(leads.map((lead) => lead.status))],
      leads,
    }))
    .sort((left, right) => right.count - left.count || left.identity_key.localeCompare(right.identity_key));
}

function emptySourceMix(): Record<IntakeSourceType, number> {
  return {
    member_referral: 0,
    opt_in: 0,
    event_check_in: 0,
    csv_import: 0,
    manual_entry: 0,
  };
}

export async function getIntakeMetrics(): Promise<ApiIntakeMetrics> {
  const [leads, duplicateGroups] = await Promise.all([
    listIntakeLeads(),
    listIntakeDuplicateGroups(),
  ]);
  const sourceMix = emptySourceMix();
  for (const lead of leads) {
    sourceMix[lead.source_type] += 1;
  }
  return {
    total_leads: leads.length,
    needs_review: leads.filter((lead) => lead.status === "needs_review").length,
    promoted: leads.filter((lead) => lead.status === "promoted").length,
    removed: leads.filter((lead) => lead.status === "removed").length,
    duplicate_groups: duplicateGroups.length,
    source_mix: sourceMix,
  };
}

function intakeSourceLabel(sourceType: IntakeSourceType) {
  const label = sourceType.replaceAll("_", " ");
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

export async function promoteIntakeLeadToProspect(leadId: string): Promise<ApiProspect> {
  await ensureSchema();
  const db = sql();
  const leadRows = await db`SELECT * FROM intake_leads WHERE id = ${leadId} LIMIT 1`;
  if (leadRows.length === 0) {
    throw new ServerStoreError("Intake lead not found.", 404);
  }

  const lead = mapIntakeLeadRow(leadRows[0]);
  if (lead.status !== "needs_review" && lead.status !== "rejected") {
    throw new ServerStoreError("Only reviewable intake leads can be promoted.");
  }

  const sourceName = intakeSourceLabel(lead.source_type);
  await ensureNotSuppressed(sourceName, lead.primary_handle);
  const prospectId = randomUUID();
  const noteParts = [
    "Promoted from intake lead.",
    `Source: ${lead.source_label}.`,
    `Evidence: ${lead.evidence}`,
  ];
  if (lead.referred_by) {
    noteParts.push(`Referred by: ${lead.referred_by}.`);
  }
  if (lead.event_name) {
    noteParts.push(`Event: ${lead.event_name}.`);
  }
  if (lead.notes) {
    noteParts.push(`Notes: ${lead.notes}`);
  }

  const [prospectRows] = await db.transaction((transaction) => [
    transaction`
      INSERT INTO prospects (
        id,
        first_name,
        last_name,
        preferred_name,
        hometown,
        high_school,
        rush_score,
        status,
        interests,
        notes,
        source_platform,
        primary_handle,
        normalized_handle,
        collection_method,
        public_information_confirmed
      )
      VALUES (
        ${prospectId},
        ${lead.first_name},
        ${lead.last_name},
        ${lead.preferred_name || lead.first_name},
        ${lead.hometown},
        ${lead.high_school},
        ${60 + Math.min(lead.interests.length * 5, 20)},
        'identified',
        ${JSON.stringify(lead.interests)}::jsonb,
        ${noteParts.join(" ")},
        ${sourceName},
        ${lead.primary_handle},
        ${normalizeIdentity(lead.primary_handle)},
        'manual',
        true
      )
      RETURNING
        id,
        first_name,
        last_name,
        preferred_name,
        source_platform,
        primary_handle,
        source_url,
        collection_method,
        public_information_confirmed AS permission_confirmed,
        status,
        rush_score,
        interests
    `,
    transaction`
      UPDATE intake_leads
      SET status = 'promoted',
        promoted_prospect_id = ${prospectId},
        updated_at = now()
      WHERE id = ${leadId}
    `,
  ]);

  return mapProspectRow(prospectRows[0]);
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell);
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) {
    rows.push(row);
  }
  return rows;
}

function csvRecords(csvText: string) {
  const rows = parseCsvRows(csvText.trim());
  if (rows.length === 0) {
    return [];
  }
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((row) => Object.fromEntries(
    headers.map((header, index) => [header, row[index] || ""]),
  ));
}

function splitImportName(row: Record<string, string>) {
  const firstName = row.first_name?.trim();
  const lastName = row.last_name?.trim();
  if (firstName) {
    return { firstName, lastName: lastName || null };
  }
  const parts = (row.name || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || null,
  };
}

export async function importIntakeCsv(input: {
  source_label?: unknown;
  csv_text?: unknown;
}): Promise<ApiIntakeCsvImportResult> {
  const sourceLabel = requiredString(input.source_label, "source_label", 160);
  const csvText = requiredString(input.csv_text, "csv_text", 250_000);
  const createdLeads: ApiIntakeLead[] = [];
  const errors: string[] = [];
  let skippedCount = 0;

  for (const [index, row] of csvRecords(csvText).entries()) {
    const { firstName, lastName } = splitImportName(row);
    if (!firstName) {
      skippedCount += 1;
      errors.push(`Row ${index + 2}: missing name or first_name.`);
      continue;
    }
    createdLeads.push(await createIntakeLead({
      first_name: firstName,
      last_name: lastName,
      preferred_name: row.preferred_name?.trim() || firstName,
      primary_handle: row.handle?.trim() || row.primary_handle?.trim() || null,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      hometown: row.hometown?.trim() || null,
      high_school: row.high_school?.trim() || null,
      interests: stringArray(row.interests),
      source_type: "csv_import",
      source_label: sourceLabel,
      referred_by: row.referred_by?.trim() || null,
      event_name: row.event_name?.trim() || null,
      evidence: `Imported from CSV source: ${sourceLabel}.`,
      notes: row.notes?.trim() || null,
    }));
  }

  return {
    created_count: createdLeads.length,
    skipped_count: skippedCount,
    errors,
    created_leads: createdLeads,
  };
}
