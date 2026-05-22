import { describe, expect, it } from "vitest";

import {
  buildGoogleSearchUrl,
  formatDuplicateGroupLabel,
  getExpansionMetrics,
  getCandidateMetrics,
  groupCandidatesByStatus,
  mapApiDuplicateGroup,
  mapApiSavedSearchQuery,
  mapApiSourceAtlasEntry,
  mapApiSourceAtlasReportItem,
  getSourceAtlasMetrics,
  type CandidateLead,
  type DiscoveryCoverage,
  mapApiSourceSetupResult,
} from "./discovery";

const candidates: CandidateLead[] = [
  {
    id: "candidate-1",
    sourceId: "source-1",
    runId: "run-1",
    displayName: "Avery Cole",
    handle: "@averycole",
    sourcePlatform: "Public web",
    sourceUrl: "https://example.edu/orientation",
    evidence: "Avery Cole is an incoming freshman at Washburn University.",
    rationale: "public page matched recruitment context",
    confidenceScore: 84,
    status: "needs_review",
    rejectionReason: null,
    promotedProspectId: null,
  },
  {
    id: "candidate-2",
    sourceId: "source-1",
    runId: "run-1",
    displayName: "Jordan Hayes",
    handle: null,
    sourcePlatform: "Public web",
    sourceUrl: "https://example.edu/orientation",
    evidence: "Jordan Hayes joined orientation Discord.",
    rationale: "public page matched recruitment context",
    confidenceScore: 76,
    status: "approved",
    rejectionReason: null,
    promotedProspectId: null,
  },
  {
    id: "candidate-3",
    sourceId: "source-1",
    runId: "run-1",
    displayName: "Noah Bennett",
    handle: null,
    sourcePlatform: "Public web",
    sourceUrl: "https://example.edu/orientation",
    evidence: "Noah Bennett is on a public roster.",
    rationale: "public page matched recruitment context",
    confidenceScore: 69,
    status: "rejected",
    rejectionReason: "Not an incoming student.",
    promotedProspectId: null,
  },
  {
    id: "candidate-4",
    sourceId: "source-1",
    runId: "run-1",
    displayName: "Avery Cole",
    handle: "@averycole",
    sourcePlatform: "Public web",
    sourceUrl: "https://example.edu/orientation",
    evidence: "Avery Cole appeared in a duplicate source.",
    rationale: "manual review determined not applicable",
    confidenceScore: 82,
    status: "removed",
    rejectionReason: "Not fraternity-relevant after manual review.",
    promotedProspectId: null,
  },
];

describe("groupCandidatesByStatus", () => {
  it("groups candidates into every review bucket", () => {
    const grouped = groupCandidatesByStatus(candidates);

    expect(grouped.needs_review.map((candidate) => candidate.id)).toEqual(["candidate-1"]);
    expect(grouped.approved.map((candidate) => candidate.id)).toEqual(["candidate-2"]);
    expect(grouped.rejected.map((candidate) => candidate.id)).toEqual(["candidate-3"]);
    expect(grouped.removed.map((candidate) => candidate.id)).toEqual(["candidate-4"]);
    expect(grouped.promoted).toEqual([]);
  });
});

describe("getCandidateMetrics", () => {
  it("summarizes review queue health", () => {
    const metrics = getCandidateMetrics(candidates);

    expect(metrics.totalCandidates).toBe(4);
    expect(metrics.needsReview).toBe(1);
    expect(metrics.approved).toBe(1);
    expect(metrics.averageConfidence).toBe(78);
  });
});

describe("source expansion helpers", () => {
  it("builds a usable Google search URL from the query text", () => {
    const url = buildGoogleSearchUrl('"Washburn University" "incoming freshman"');

    expect(url).toBe(
      "https://www.google.com/search?q=%22Washburn+University%22+%22incoming+freshman%22",
    );
  });

  it("maps saved search queries from API shape", () => {
    const query = mapApiSavedSearchQuery({
      id: "query-1",
      label: "Washburn incoming class search",
      query: '"Washburn University" "incoming freshman"',
      source_type: "public_web_page",
      source_platform: "Search",
      source_url: "https://www.google.com/search?q=Washburn",
      public_access_confirmed: true,
      notes: "Manual search recipe.",
      active: true,
      created_at: "2026-05-22T10:00:00Z",
      updated_at: "2026-05-22T10:00:00Z",
    });

    expect(query.sourceType).toBe("public_web_page");
    expect(query.publicAccessConfirmed).toBe(true);
    expect(query.sourceUrl).toContain("google.com");
  });

  it("maps duplicate groups and creates compact labels", () => {
    const group = mapApiDuplicateGroup({
      identity_key: "handle:averycole",
      label: "@averycole",
      count: 2,
      statuses: ["needs_review", "removed"],
      candidates: [
        {
          id: "candidate-1",
          source_id: "source-1",
          run_id: "run-1",
          display_name: "Avery Cole",
          handle: "@averycole",
          source_platform: "Search",
          source_url: "https://example.com",
          evidence: "Avery Cole is an incoming freshman at Washburn University.",
          rationale: "public page matched recruitment context",
          confidence_score: 84,
          status: "needs_review",
          rejection_reason: null,
          promoted_prospect_id: null,
        },
        {
          id: "candidate-2",
          source_id: "source-2",
          run_id: "run-2",
          display_name: "Avery Cole",
          handle: "@averycole",
          source_platform: "Search",
          source_url: "https://example.com/2",
          evidence: "Avery Cole posted publicly about Washburn orientation.",
          rationale: "public page matched recruitment context",
          confidence_score: 82,
          status: "removed",
          rejection_reason: "Not fraternity-relevant after review.",
          promoted_prospect_id: null,
        },
      ],
    });

    expect(group.identityKey).toBe("handle:averycole");
    expect(group.candidates).toHaveLength(2);
    expect(formatDuplicateGroupLabel(group)).toBe("@averycole / 2 matches");
  });

  it("summarizes source expansion coverage", () => {
    const coverage: DiscoveryCoverage = {
      totalCandidates: 5,
      uniqueCandidates: 4,
      usableLeads: 3,
      expectedMalePool: 430,
      coveragePercent: 0.7,
    };

    const metrics = getExpansionMetrics({
      savedQueryCount: 6,
      duplicateGroupCount: 1,
      coverage,
    });

    expect(metrics.savedQueryCount).toBe(6);
    expect(metrics.uniqueLeadLabel).toBe("3 / 430");
    expect(metrics.coverageLabel).toBe("0.7%");
    expect(metrics.duplicateGroupCount).toBe(1);
  });

  it("maps source atlas entries and report items", () => {
    const apiSource = {
      id: "atlas-1",
      name: "Washburn football roster",
      url: "https://wusports.com/sports/football/roster",
      category: "athletics" as const,
      source_type: "athletics_roster" as const,
      source_platform: "WUsports",
      public_access_confirmed: true,
      priority: 5,
      review_cadence_days: 14,
      notes: "Official roster.",
      status: "active" as const,
      created_at: "2026-05-22T10:00:00Z",
      updated_at: "2026-05-22T10:00:00Z",
    };
    const reportItem = mapApiSourceAtlasReportItem({
      source: apiSource,
      import_count: 1,
      total_candidates: 2,
      usable_leads: 1,
      last_imported_at: "2026-05-22T11:00:00Z",
    });
    const source = mapApiSourceAtlasEntry(apiSource);

    expect(source.category).toBe("athletics");
    expect(reportItem.source.name).toBe("Washburn football roster");
    expect(reportItem.totalCandidates).toBe(2);
    expect(reportItem.usableLeads).toBe(1);
  });

  it("summarizes source atlas yield", () => {
    const metrics = getSourceAtlasMetrics([
      {
        source: {
          id: "atlas-1",
          name: "Washburn football roster",
          url: "https://wusports.com/sports/football/roster",
          category: "athletics",
          sourceType: "athletics_roster",
          sourcePlatform: "WUsports",
          publicAccessConfirmed: true,
          priority: 5,
          reviewCadenceDays: 14,
          notes: null,
          status: "active",
          createdAt: "2026-05-22T10:00:00Z",
          updatedAt: "2026-05-22T10:00:00Z",
        },
        importCount: 2,
        totalCandidates: 5,
        usableLeads: 3,
        lastImportedAt: "2026-05-22T11:00:00Z",
      },
    ]);

    expect(metrics.sourceCount).toBe(1);
    expect(metrics.importCount).toBe(2);
    expect(metrics.totalCandidates).toBe(5);
    expect(metrics.usableLeads).toBe(3);
    expect(metrics.yieldLabel).toBe("3 usable / 5 total");
  });

  it("maps source setup pack results from API shape", () => {
    const result = mapApiSourceSetupResult({
      atlas_sources_created: 10,
      atlas_sources_skipped: 1,
      saved_searches_created: 8,
      saved_searches_skipped: 2,
      created_source_names: ["Washburn new student orientation"],
      created_search_labels: ["Washburn incoming class"],
    });

    expect(result.atlasSourcesCreated).toBe(10);
    expect(result.atlasSourcesSkipped).toBe(1);
    expect(result.savedSearchesCreated).toBe(8);
    expect(result.savedSearchesSkipped).toBe(2);
    expect(result.createdSourceNames).toEqual(["Washburn new student orientation"]);
    expect(result.createdSearchLabels).toEqual(["Washburn incoming class"]);
  });
});
