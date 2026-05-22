export type IntakeSourceType =
  | "member_referral"
  | "opt_in"
  | "event_check_in"
  | "csv_import"
  | "manual_entry"
  | "public_source";

export type IntakeLeadStatus = "needs_review" | "promoted" | "rejected" | "removed";

export type IntakeLead = {
  id: string;
  firstName: string;
  lastName: string | null;
  preferredName: string | null;
  primaryHandle: string | null;
  phone: string | null;
  email: string | null;
  hometown: string | null;
  highSchool: string | null;
  interests: string[];
  sourceType: IntakeSourceType;
  sourceLabel: string;
  referredBy: string | null;
  eventName: string | null;
  evidence: string;
  notes: string | null;
  status: IntakeLeadStatus;
  rejectionReason: string | null;
  promotedProspectId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntakeDuplicateGroup = {
  identityKey: string;
  label: string;
  count: number;
  statuses: IntakeLeadStatus[];
  leads: IntakeLead[];
};

export type IntakeMetrics = {
  totalLeads: number;
  needsReview: number;
  promoted: number;
  removed: number;
  duplicateGroups: number;
  sourceMix: Record<IntakeSourceType, number>;
};

export type IntakeCsvImportResult = {
  createdCount: number;
  skippedCount: number;
  errors: string[];
  createdLeads: IntakeLead[];
};

export type IntakeGroups = Record<IntakeLeadStatus, IntakeLead[]>;

export type ApiIntakeLead = {
  id: string;
  first_name: string;
  last_name: string | null;
  preferred_name: string | null;
  primary_handle: string | null;
  phone: string | null;
  email: string | null;
  hometown: string | null;
  high_school: string | null;
  interests: string[];
  source_type: IntakeSourceType;
  source_label: string;
  referred_by: string | null;
  event_name: string | null;
  evidence: string;
  notes: string | null;
  status: IntakeLeadStatus;
  rejection_reason: string | null;
  promoted_prospect_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiIntakeDuplicateGroup = {
  identity_key: string;
  label: string;
  count: number;
  statuses: IntakeLeadStatus[];
  leads: ApiIntakeLead[];
};

export type ApiIntakeMetrics = {
  total_leads: number;
  needs_review: number;
  promoted: number;
  removed: number;
  duplicate_groups: number;
  source_mix: Record<IntakeSourceType, number>;
};

export type ApiIntakeCsvImportResult = {
  created_count: number;
  skipped_count: number;
  errors: string[];
  created_leads: ApiIntakeLead[];
};

export const intakeStatuses: Array<{ id: IntakeLeadStatus; label: string }> = [
  { id: "needs_review", label: "Needs Review" },
  { id: "promoted", label: "Promoted" },
  { id: "rejected", label: "Rejected" },
  { id: "removed", label: "Removed / N/A" },
];

export const intakeSourceOptions: Array<{ id: IntakeSourceType; label: string }> = [
  { id: "member_referral", label: "Member referral" },
  { id: "opt_in", label: "Opt-in form" },
  { id: "event_check_in", label: "Event check-in" },
  { id: "csv_import", label: "CSV import" },
  { id: "manual_entry", label: "Manual entry" },
  { id: "public_source", label: "Public source" },
];

export function mapApiIntakeLead(lead: ApiIntakeLead): IntakeLead {
  return {
    id: lead.id,
    firstName: lead.first_name,
    lastName: lead.last_name,
    preferredName: lead.preferred_name,
    primaryHandle: lead.primary_handle,
    phone: lead.phone,
    email: lead.email,
    hometown: lead.hometown,
    highSchool: lead.high_school,
    interests: lead.interests,
    sourceType: lead.source_type,
    sourceLabel: lead.source_label,
    referredBy: lead.referred_by,
    eventName: lead.event_name,
    evidence: lead.evidence,
    notes: lead.notes,
    status: lead.status,
    rejectionReason: lead.rejection_reason,
    promotedProspectId: lead.promoted_prospect_id,
    createdAt: lead.created_at,
    updatedAt: lead.updated_at,
  };
}

export function mapApiIntakeDuplicateGroup(
  group: ApiIntakeDuplicateGroup,
): IntakeDuplicateGroup {
  return {
    identityKey: group.identity_key,
    label: group.label,
    count: group.count,
    statuses: group.statuses,
    leads: group.leads.map(mapApiIntakeLead),
  };
}

export function mapApiIntakeMetrics(metrics: ApiIntakeMetrics): IntakeMetrics {
  return {
    totalLeads: metrics.total_leads,
    needsReview: metrics.needs_review,
    promoted: metrics.promoted,
    removed: metrics.removed,
    duplicateGroups: metrics.duplicate_groups,
    sourceMix: metrics.source_mix,
  };
}

export function mapApiIntakeCsvImportResult(
  result: ApiIntakeCsvImportResult,
): IntakeCsvImportResult {
  return {
    createdCount: result.created_count,
    skippedCount: result.skipped_count,
    errors: result.errors,
    createdLeads: result.created_leads.map(mapApiIntakeLead),
  };
}

export function groupIntakeLeadsByStatus(leads: IntakeLead[]): IntakeGroups {
  const groups = intakeStatuses.reduce((accumulator, status) => {
    accumulator[status.id] = [];
    return accumulator;
  }, {} as IntakeGroups);

  for (const lead of leads) {
    groups[lead.status].push(lead);
  }

  return groups;
}

export function getIntakeMetricsSummary(metrics: IntakeMetrics) {
  return {
    totalLeads: String(metrics.totalLeads),
    needsReview: String(metrics.needsReview),
    promoted: String(metrics.promoted),
    duplicateGroups: String(metrics.duplicateGroups),
  };
}

export function formatIntakeSource(sourceType: IntakeSourceType) {
  return intakeSourceOptions.find((option) => option.id === sourceType)?.label ?? sourceType;
}

export async function fetchIntakeSnapshot(apiBaseUrl?: string): Promise<{
  leads: IntakeLead[];
  duplicateGroups: IntakeDuplicateGroup[];
  metrics: IntakeMetrics;
}> {
  if (!apiBaseUrl) {
    return {
      leads: demoIntakeLeads,
      duplicateGroups: demoIntakeDuplicateGroups,
      metrics: demoIntakeMetrics,
    };
  }

  try {
    const [leadsResponse, duplicatesResponse, metricsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/intake-leads`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/intake-duplicates`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/intake-metrics`, { cache: "no-store" }),
    ]);
    if (!leadsResponse.ok || !duplicatesResponse.ok || !metricsResponse.ok) {
      return {
        leads: demoIntakeLeads,
        duplicateGroups: demoIntakeDuplicateGroups,
        metrics: demoIntakeMetrics,
      };
    }
    const leads = (await leadsResponse.json()) as ApiIntakeLead[];
    const duplicateGroups = (await duplicatesResponse.json()) as ApiIntakeDuplicateGroup[];
    const metrics = (await metricsResponse.json()) as ApiIntakeMetrics;
    return {
      leads: leads.map(mapApiIntakeLead),
      duplicateGroups: duplicateGroups.map(mapApiIntakeDuplicateGroup),
      metrics: mapApiIntakeMetrics(metrics),
    };
  } catch {
    return {
      leads: demoIntakeLeads,
      duplicateGroups: demoIntakeDuplicateGroups,
      metrics: demoIntakeMetrics,
    };
  }
}

export async function createIntakeLead(input: {
  apiBaseUrl: string;
  firstName: string;
  lastName?: string;
  preferredName?: string;
  primaryHandle?: string;
  phone?: string;
  email?: string;
  hometown?: string;
  highSchool?: string;
  interests: string[];
  sourceType: IntakeSourceType;
  sourceLabel: string;
  referredBy?: string;
  eventName?: string;
  evidence: string;
  notes?: string;
}) {
  const response = await fetch(`${input.apiBaseUrl}/intake-leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: input.firstName,
      last_name: input.lastName || null,
      preferred_name: input.preferredName || input.firstName,
      primary_handle: input.primaryHandle || null,
      phone: input.phone || null,
      email: input.email || null,
      hometown: input.hometown || null,
      high_school: input.highSchool || null,
      interests: input.interests,
      source_type: input.sourceType,
      source_label: input.sourceLabel,
      referred_by: input.referredBy || null,
      event_name: input.eventName || null,
      evidence: input.evidence,
      notes: input.notes || null,
    }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return mapApiIntakeLead((await response.json()) as ApiIntakeLead);
}

export async function importIntakeCsv(input: {
  apiBaseUrl: string;
  sourceLabel: string;
  csvText: string;
}) {
  const response = await fetch(`${input.apiBaseUrl}/intake-imports/csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_label: input.sourceLabel,
      csv_text: input.csvText,
    }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return mapApiIntakeCsvImportResult((await response.json()) as ApiIntakeCsvImportResult);
}

export async function updateIntakeLeadStatus(
  apiBaseUrl: string,
  leadId: string,
  status: IntakeLeadStatus,
  rejectionReason?: string,
) {
  const response = await fetch(`${apiBaseUrl}/intake-leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      rejection_reason: rejectionReason || null,
    }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return mapApiIntakeLead((await response.json()) as ApiIntakeLead);
}

export async function promoteIntakeLead(apiBaseUrl: string, leadId: string) {
  const response = await fetch(`${apiBaseUrl}/intake-leads/${leadId}/promote`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
}

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail ?? `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
}

export const demoIntakeLeads: IntakeLead[] = [
];

export const demoIntakeDuplicateGroups: IntakeDuplicateGroup[] = [
];

export const demoIntakeMetrics: IntakeMetrics = {
  totalLeads: 3,
  needsReview: 2,
  promoted: 1,
  removed: 0,
  duplicateGroups: 1,
  sourceMix: {
    member_referral: 1,
    opt_in: 1,
    event_check_in: 1,
    csv_import: 0,
    manual_entry: 0,
    public_source: 0,
  },
};
