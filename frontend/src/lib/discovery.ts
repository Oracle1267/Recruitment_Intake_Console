export type CandidateStatus =
  | "needs_review"
  | "approved"
  | "rejected"
  | "suppressed"
  | "promoted"
  | "removed";

export type DiscoverySourceType =
  | "public_web_page"
  | "athletics_roster"
  | "orientation_page"
  | "hashtag_page"
  | "public_social_profile";

export type SourceAtlasCategory =
  | "institutional"
  | "athletics"
  | "student_org"
  | "campus_event"
  | "local_news"
  | "high_school"
  | "opt_in"
  | "member_referral";

export type SourceAtlasStatus = "active" | "archived";

export type DiscoverySource = {
  id: string;
  name: string;
  url: string;
  sourceType: DiscoverySourceType;
  sourcePlatform: string;
  publicAccessConfirmed: boolean;
  robotsCheckRequired: boolean;
  notes: string | null;
};

export type SavedSearchQuery = {
  id: string;
  label: string;
  query: string;
  sourceType: DiscoverySourceType;
  sourcePlatform: string;
  sourceUrl: string;
  publicAccessConfirmed: boolean;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SourceAtlasEntry = {
  id: string;
  name: string;
  url: string;
  category: SourceAtlasCategory;
  sourceType: DiscoverySourceType;
  sourcePlatform: string;
  publicAccessConfirmed: boolean;
  priority: number;
  reviewCadenceDays: number;
  notes: string | null;
  status: SourceAtlasStatus;
  createdAt: string;
  updatedAt: string;
};

export type CandidateLead = {
  id: string;
  sourceId: string;
  runId: string;
  displayName: string | null;
  handle: string | null;
  sourcePlatform: string;
  sourceUrl: string;
  evidence: string;
  rationale: string;
  confidenceScore: number;
  status: CandidateStatus;
  rejectionReason: string | null;
  promotedProspectId: string | null;
};

export type SourceImportBatch = {
  id: string;
  savedSearchQueryId: string | null;
  sourceId: string;
  runId: string;
  importMethod: string;
  publicAccessConfirmed: boolean;
  pastedResultsExcerpt: string;
  candidatesCreated: number;
  notes: string | null;
  createdAt: string;
};

export type CandidateDuplicateGroup = {
  identityKey: string;
  label: string;
  count: number;
  statuses: CandidateStatus[];
  candidates: CandidateLead[];
};

export type DiscoveryCoverage = {
  totalCandidates: number;
  uniqueCandidates: number;
  usableLeads: number;
  expectedMalePool: number;
  coveragePercent: number;
};

export type SourceAtlasReportItem = {
  source: SourceAtlasEntry;
  importCount: number;
  totalCandidates: number;
  usableLeads: number;
  lastImportedAt: string | null;
};

export type SourceAtlasMetrics = {
  sourceCount: number;
  importCount: number;
  totalCandidates: number;
  usableLeads: number;
  yieldLabel: string;
};

export type SourceSetupResult = {
  atlasSourcesCreated: number;
  atlasSourcesSkipped: number;
  savedSearchesCreated: number;
  savedSearchesSkipped: number;
  createdSourceNames: string[];
  createdSearchLabels: string[];
};

export type ExpansionMetrics = {
  savedQueryCount: number;
  duplicateGroupCount: number;
  totalCandidates: number;
  uniqueCandidates: number;
  usableLeads: number;
  expectedMalePool: number;
  uniqueLeadLabel: string;
  coverageLabel: string;
};

export type CandidateGroups = Record<CandidateStatus, CandidateLead[]>;

export type CandidateMetrics = {
  totalCandidates: number;
  needsReview: number;
  approved: number;
  averageConfidence: number;
};

type ApiDiscoverySource = {
  id: string;
  name: string;
  url: string;
  source_type: DiscoverySourceType;
  source_platform: string;
  public_access_confirmed: boolean;
  robots_check_required: boolean;
  notes: string | null;
};

type ApiSavedSearchQuery = {
  id: string;
  label: string;
  query: string;
  source_type: DiscoverySourceType;
  source_platform: string;
  source_url: string;
  public_access_confirmed: boolean;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ApiSourceAtlasEntry = {
  id: string;
  name: string;
  url: string;
  category: SourceAtlasCategory;
  source_type: DiscoverySourceType;
  source_platform: string;
  public_access_confirmed: boolean;
  priority: number;
  review_cadence_days: number;
  notes: string | null;
  status: SourceAtlasStatus;
  created_at: string;
  updated_at: string;
};

type ApiCandidateLead = {
  id: string;
  source_id: string;
  run_id: string;
  display_name: string | null;
  handle: string | null;
  source_platform: string;
  source_url: string;
  evidence: string;
  rationale: string;
  confidence_score: number;
  status: CandidateStatus;
  rejection_reason: string | null;
  promoted_prospect_id: string | null;
};

type ApiSourceImportBatch = {
  id: string;
  saved_search_query_id: string | null;
  source_id: string;
  run_id: string;
  import_method: string;
  public_access_confirmed: boolean;
  pasted_results_excerpt: string;
  candidates_created: number;
  notes: string | null;
  created_at: string;
};

type ApiCandidateDuplicateGroup = {
  identity_key: string;
  label: string;
  count: number;
  statuses: CandidateStatus[];
  candidates: ApiCandidateLead[];
};

type ApiDiscoveryCoverage = {
  total_candidates: number;
  unique_candidates: number;
  usable_leads: number;
  expected_male_pool: number;
  coverage_percent: number;
};

type ApiSourceAtlasReportItem = {
  source: ApiSourceAtlasEntry;
  import_count: number;
  total_candidates: number;
  usable_leads: number;
  last_imported_at: string | null;
};

type ApiSourceSetupResult = {
  atlas_sources_created: number;
  atlas_sources_skipped: number;
  saved_searches_created: number;
  saved_searches_skipped: number;
  created_source_names: string[];
  created_search_labels: string[];
};

type ApiDiscoveryRun = {
  id: string;
  source_id: string;
  status: "completed" | "blocked" | "failed";
  candidates_found: number;
  error: string | null;
};

export const candidateStatuses: Array<{ id: CandidateStatus; label: string }> = [
  { id: "needs_review", label: "Needs Review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "suppressed", label: "Suppressed" },
  { id: "promoted", label: "Promoted" },
  { id: "removed", label: "Removed / N/A" },
];

export function groupCandidatesByStatus(candidates: CandidateLead[]): CandidateGroups {
  const groups = candidateStatuses.reduce((accumulator, status) => {
    accumulator[status.id] = [];
    return accumulator;
  }, {} as CandidateGroups);

  for (const candidate of candidates) {
    groups[candidate.status].push(candidate);
  }

  return groups;
}

export function getCandidateMetrics(candidates: CandidateLead[]): CandidateMetrics {
  const totalConfidence = candidates.reduce(
    (total, candidate) => total + candidate.confidenceScore,
    0,
  );
  return {
    totalCandidates: candidates.length,
    needsReview: candidates.filter((candidate) => candidate.status === "needs_review").length,
    approved: candidates.filter((candidate) => candidate.status === "approved").length,
    averageConfidence:
      candidates.length === 0 ? 0 : Math.round(totalConfidence / candidates.length),
  };
}

export function buildGoogleSearchUrl(query: string) {
  const params = new URLSearchParams({ q: query.trim() });
  return `https://www.google.com/search?${params.toString()}`;
}

export function mapApiSource(source: ApiDiscoverySource): DiscoverySource {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    sourceType: source.source_type,
    sourcePlatform: source.source_platform,
    publicAccessConfirmed: source.public_access_confirmed,
    robotsCheckRequired: source.robots_check_required,
    notes: source.notes,
  };
}

export function mapApiSavedSearchQuery(query: ApiSavedSearchQuery): SavedSearchQuery {
  return {
    id: query.id,
    label: query.label,
    query: query.query,
    sourceType: query.source_type,
    sourcePlatform: query.source_platform,
    sourceUrl: query.source_url,
    publicAccessConfirmed: query.public_access_confirmed,
    notes: query.notes,
    active: query.active,
    createdAt: query.created_at,
    updatedAt: query.updated_at,
  };
}

export function mapApiSourceAtlasEntry(source: ApiSourceAtlasEntry): SourceAtlasEntry {
  return {
    id: source.id,
    name: source.name,
    url: source.url,
    category: source.category,
    sourceType: source.source_type,
    sourcePlatform: source.source_platform,
    publicAccessConfirmed: source.public_access_confirmed,
    priority: source.priority,
    reviewCadenceDays: source.review_cadence_days,
    notes: source.notes,
    status: source.status,
    createdAt: source.created_at,
    updatedAt: source.updated_at,
  };
}

export function mapApiCandidate(candidate: ApiCandidateLead): CandidateLead {
  return {
    id: candidate.id,
    sourceId: candidate.source_id,
    runId: candidate.run_id,
    displayName: candidate.display_name,
    handle: candidate.handle,
    sourcePlatform: candidate.source_platform,
    sourceUrl: candidate.source_url,
    evidence: candidate.evidence,
    rationale: candidate.rationale,
    confidenceScore: candidate.confidence_score,
    status: candidate.status,
    rejectionReason: candidate.rejection_reason,
    promotedProspectId: candidate.promoted_prospect_id,
  };
}

export function mapApiSourceImportBatch(batch: ApiSourceImportBatch): SourceImportBatch {
  return {
    id: batch.id,
    savedSearchQueryId: batch.saved_search_query_id,
    sourceId: batch.source_id,
    runId: batch.run_id,
    importMethod: batch.import_method,
    publicAccessConfirmed: batch.public_access_confirmed,
    pastedResultsExcerpt: batch.pasted_results_excerpt,
    candidatesCreated: batch.candidates_created,
    notes: batch.notes,
    createdAt: batch.created_at,
  };
}

export function mapApiDuplicateGroup(
  group: ApiCandidateDuplicateGroup,
): CandidateDuplicateGroup {
  return {
    identityKey: group.identity_key,
    label: group.label,
    count: group.count,
    statuses: group.statuses,
    candidates: group.candidates.map(mapApiCandidate),
  };
}

export function mapApiCoverage(coverage: ApiDiscoveryCoverage): DiscoveryCoverage {
  return {
    totalCandidates: coverage.total_candidates,
    uniqueCandidates: coverage.unique_candidates,
    usableLeads: coverage.usable_leads,
    expectedMalePool: coverage.expected_male_pool,
    coveragePercent: coverage.coverage_percent,
  };
}

export function mapApiSourceAtlasReportItem(
  item: ApiSourceAtlasReportItem,
): SourceAtlasReportItem {
  return {
    source: mapApiSourceAtlasEntry(item.source),
    importCount: item.import_count,
    totalCandidates: item.total_candidates,
    usableLeads: item.usable_leads,
    lastImportedAt: item.last_imported_at,
  };
}

export function mapApiSourceSetupResult(result: ApiSourceSetupResult): SourceSetupResult {
  return {
    atlasSourcesCreated: result.atlas_sources_created,
    atlasSourcesSkipped: result.atlas_sources_skipped,
    savedSearchesCreated: result.saved_searches_created,
    savedSearchesSkipped: result.saved_searches_skipped,
    createdSourceNames: result.created_source_names,
    createdSearchLabels: result.created_search_labels,
  };
}

export function formatDuplicateGroupLabel(group: CandidateDuplicateGroup) {
  return `${group.label} / ${group.count} matches`;
}

export function getExpansionMetrics(input: {
  savedQueryCount: number;
  duplicateGroupCount: number;
  coverage: DiscoveryCoverage;
}): ExpansionMetrics {
  return {
    savedQueryCount: input.savedQueryCount,
    duplicateGroupCount: input.duplicateGroupCount,
    totalCandidates: input.coverage.totalCandidates,
    uniqueCandidates: input.coverage.uniqueCandidates,
    usableLeads: input.coverage.usableLeads,
    expectedMalePool: input.coverage.expectedMalePool,
    uniqueLeadLabel: `${input.coverage.usableLeads} / ${input.coverage.expectedMalePool}`,
    coverageLabel: `${input.coverage.coveragePercent}%`,
  };
}

export function getSourceAtlasMetrics(
  reportItems: SourceAtlasReportItem[],
): SourceAtlasMetrics {
  const importCount = reportItems.reduce((total, item) => total + item.importCount, 0);
  const totalCandidates = reportItems.reduce(
    (total, item) => total + item.totalCandidates,
    0,
  );
  const usableLeads = reportItems.reduce((total, item) => total + item.usableLeads, 0);
  return {
    sourceCount: reportItems.length,
    importCount,
    totalCandidates,
    usableLeads,
    yieldLabel: `${usableLeads} usable / ${totalCandidates} total`,
  };
}

export async function fetchDiscoverySnapshot(apiBaseUrl?: string): Promise<{
  sources: DiscoverySource[];
  candidates: CandidateLead[];
}> {
  if (!apiBaseUrl) {
    return { sources: demoSources, candidates: demoCandidates };
  }

  try {
    const [sourcesResponse, candidatesResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/discovery-sources`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/candidate-leads`, { cache: "no-store" }),
    ]);
    if (!sourcesResponse.ok || !candidatesResponse.ok) {
      return { sources: demoSources, candidates: demoCandidates };
    }
    const sources = (await sourcesResponse.json()) as ApiDiscoverySource[];
    const candidates = (await candidatesResponse.json()) as ApiCandidateLead[];
    return {
      sources: sources.map(mapApiSource),
      candidates: candidates.map(mapApiCandidate),
    };
  } catch {
    return { sources: demoSources, candidates: demoCandidates };
  }
}

export async function fetchSourceExpansionSnapshot(
  apiBaseUrl: string | undefined,
  expectedMalePool = 430,
): Promise<{
  savedQueries: SavedSearchQuery[];
  duplicateGroups: CandidateDuplicateGroup[];
  coverage: DiscoveryCoverage;
}> {
  if (!apiBaseUrl) {
    return {
      savedQueries: demoSavedQueries,
      duplicateGroups: demoDuplicateGroups,
      coverage: demoCoverage,
    };
  }

  try {
    const [queriesResponse, duplicatesResponse, coverageResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/saved-search-queries`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/candidate-duplicates`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/discovery-coverage?expected_male_pool=${expectedMalePool}`, {
        cache: "no-store",
      }),
    ]);
    if (!queriesResponse.ok || !duplicatesResponse.ok || !coverageResponse.ok) {
      return {
        savedQueries: demoSavedQueries,
        duplicateGroups: demoDuplicateGroups,
        coverage: demoCoverage,
      };
    }
    const queries = (await queriesResponse.json()) as ApiSavedSearchQuery[];
    const duplicates = (await duplicatesResponse.json()) as ApiCandidateDuplicateGroup[];
    const coverage = (await coverageResponse.json()) as ApiDiscoveryCoverage;
    return {
      savedQueries: queries.map(mapApiSavedSearchQuery),
      duplicateGroups: duplicates.map(mapApiDuplicateGroup),
      coverage: mapApiCoverage(coverage),
    };
  } catch {
    return {
      savedQueries: demoSavedQueries,
      duplicateGroups: demoDuplicateGroups,
      coverage: demoCoverage,
    };
  }
}

export async function fetchSourceAtlasSnapshot(apiBaseUrl?: string): Promise<{
  entries: SourceAtlasEntry[];
  report: SourceAtlasReportItem[];
}> {
  if (!apiBaseUrl) {
    return {
      entries: demoSourceAtlasEntries,
      report: demoSourceAtlasReport,
    };
  }

  try {
    const [entriesResponse, reportResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/source-atlas`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/source-atlas/report`, { cache: "no-store" }),
    ]);
    if (!entriesResponse.ok || !reportResponse.ok) {
      return {
        entries: demoSourceAtlasEntries,
        report: demoSourceAtlasReport,
      };
    }
    const entries = (await entriesResponse.json()) as ApiSourceAtlasEntry[];
    const report = (await reportResponse.json()) as ApiSourceAtlasReportItem[];
    return {
      entries: entries.map(mapApiSourceAtlasEntry),
      report: report.map(mapApiSourceAtlasReportItem),
    };
  } catch {
    return {
      entries: demoSourceAtlasEntries,
      report: demoSourceAtlasReport,
    };
  }
}

export async function createSourceAndRunDiscovery(input: {
  apiBaseUrl: string;
  name: string;
  url: string;
  sourceType: DiscoverySourceType;
  sourcePlatform: string;
  htmlOverride: string;
}) {
  const sourceResponse = await fetch(`${input.apiBaseUrl}/discovery-sources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      url: input.url,
      source_type: input.sourceType,
      source_platform: input.sourcePlatform,
      public_access_confirmed: true,
      robots_check_required: true,
      notes: "Created from Discovery Inbox.",
    }),
  });
  if (!sourceResponse.ok) {
    throw new Error(await readApiError(sourceResponse));
  }
  const source = (await sourceResponse.json()) as ApiDiscoverySource;
  const runResponse = await fetch(`${input.apiBaseUrl}/discovery-runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_id: source.id,
      html_override: input.htmlOverride,
    }),
  });
  if (!runResponse.ok) {
    throw new Error(await readApiError(runResponse));
  }
  return (await runResponse.json()) as ApiDiscoveryRun;
}

export async function createSavedSearchQuery(input: {
  apiBaseUrl: string;
  label: string;
  query: string;
  sourceType: DiscoverySourceType;
  sourcePlatform: string;
  sourceUrl: string;
  notes?: string;
}) {
  const response = await fetch(`${input.apiBaseUrl}/saved-search-queries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      label: input.label,
      query: input.query,
      source_type: input.sourceType,
      source_platform: input.sourcePlatform,
      source_url: input.sourceUrl,
      public_access_confirmed: true,
      notes: input.notes ?? null,
    }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return mapApiSavedSearchQuery((await response.json()) as ApiSavedSearchQuery);
}

export async function createSourceAtlasEntry(input: {
  apiBaseUrl: string;
  name: string;
  url: string;
  category: SourceAtlasCategory;
  sourceType: DiscoverySourceType;
  sourcePlatform: string;
  priority: number;
  reviewCadenceDays: number;
  notes?: string;
}) {
  const response = await fetch(`${input.apiBaseUrl}/source-atlas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      url: input.url,
      category: input.category,
      source_type: input.sourceType,
      source_platform: input.sourcePlatform,
      public_access_confirmed: true,
      priority: input.priority,
      review_cadence_days: input.reviewCadenceDays,
      notes: input.notes ?? null,
    }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return mapApiSourceAtlasEntry((await response.json()) as ApiSourceAtlasEntry);
}

export async function seedWashburnSourcePack(apiBaseUrl: string) {
  const response = await fetch(`${apiBaseUrl}/source-setup/washburn`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return mapApiSourceSetupResult((await response.json()) as ApiSourceSetupResult);
}

export async function archiveSourceAtlasEntry(apiBaseUrl: string, sourceAtlasEntryId: string) {
  const response = await fetch(`${apiBaseUrl}/source-atlas/${sourceAtlasEntryId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return mapApiSourceAtlasEntry((await response.json()) as ApiSourceAtlasEntry);
}

export async function deleteSavedSearchQuery(apiBaseUrl: string, queryId: string) {
  const response = await fetch(`${apiBaseUrl}/saved-search-queries/${queryId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return mapApiSavedSearchQuery((await response.json()) as ApiSavedSearchQuery);
}

export async function importPublicResults(input: {
  apiBaseUrl: string;
  savedSearchQueryId?: string | null;
  sourceAtlasEntryId?: string | null;
  name: string;
  url: string;
  sourceType: DiscoverySourceType;
  sourcePlatform: string;
  pastedResults: string;
  notes?: string;
}) {
  const response = await fetch(`${input.apiBaseUrl}/source-imports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      saved_search_query_id: input.savedSearchQueryId ?? null,
      source_atlas_entry_id: input.sourceAtlasEntryId ?? null,
      name: input.name,
      url: input.url,
      source_type: input.sourceType,
      source_platform: input.sourcePlatform,
      public_access_confirmed: true,
      pasted_results: input.pastedResults,
      notes: input.notes ?? null,
    }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return mapApiSourceImportBatch((await response.json()) as ApiSourceImportBatch);
}

export async function updateCandidateReview(
  apiBaseUrl: string,
  candidateId: string,
  status: CandidateStatus,
  rejectionReason?: string,
) {
  const response = await fetch(`${apiBaseUrl}/candidate-leads/${candidateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      rejection_reason: rejectionReason ?? null,
    }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }
  return mapApiCandidate((await response.json()) as ApiCandidateLead);
}

export async function promoteCandidate(apiBaseUrl: string, candidateId: string) {
  const response = await fetch(`${apiBaseUrl}/candidate-leads/${candidateId}/promote`, {
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

export const demoSources: DiscoverySource[] = [
];

export const demoCandidates: CandidateLead[] = [
];

export const demoSavedQueries: SavedSearchQuery[] = [
];

export const demoDuplicateGroups: CandidateDuplicateGroup[] = [
];

export const demoCoverage: DiscoveryCoverage = {
  totalCandidates: 0,
  uniqueCandidates: 0,
  usableLeads: 0,
  expectedMalePool: 430,
  coveragePercent: 0,
};

export const demoSourceAtlasEntries: SourceAtlasEntry[] = [
];

export const demoSourceAtlasReport: SourceAtlasReportItem[] = [
];
