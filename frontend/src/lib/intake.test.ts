import { describe, expect, it } from "vitest";

import {
  getIntakeMetricsSummary,
  groupIntakeLeadsByStatus,
  intakeStatuses,
  mapApiIntakeCsvImportResult,
  mapApiIntakeDuplicateGroup,
  mapApiIntakeLead,
  mapApiIntakeMetrics,
  type IntakeLead,
} from "./intake";

const leads: IntakeLead[] = [
  {
    id: "lead-1",
    firstName: "Mason",
    lastName: "Rivera",
    preferredName: "Mason",
    primaryHandle: "@masonrivera",
    phone: "785-555-0142",
    email: "mason@example.com",
    hometown: "Topeka, KS",
    highSchool: "Washburn Rural",
    interests: ["intramurals"],
    sourceType: "member_referral",
    sourceLabel: "Brother referral",
    referredBy: "Sam W.",
    eventName: null,
    evidence: "Sam met Mason at orientation.",
    notes: "Follow up.",
    status: "needs_review",
    rejectionReason: null,
    promotedProspectId: null,
    createdAt: "2026-05-22T10:00:00Z",
    updatedAt: "2026-05-22T10:00:00Z",
  },
  {
    id: "lead-2",
    firstName: "Noah",
    lastName: "Bennett",
    preferredName: "Noah",
    primaryHandle: null,
    phone: null,
    email: "noah@example.com",
    hometown: null,
    highSchool: null,
    interests: ["basketball"],
    sourceType: "opt_in",
    sourceLabel: "Interest form",
    referredBy: null,
    eventName: null,
    evidence: "Noah submitted the interest form.",
    notes: null,
    status: "promoted",
    rejectionReason: null,
    promotedProspectId: "prospect-1",
    createdAt: "2026-05-22T10:00:00Z",
    updatedAt: "2026-05-22T10:00:00Z",
  },
  {
    id: "lead-3",
    firstName: "Jordan",
    lastName: "Hayes",
    preferredName: "Jordan",
    primaryHandle: null,
    phone: null,
    email: null,
    hometown: null,
    highSchool: null,
    interests: [],
    sourceType: "event_check_in",
    sourceLabel: "Welcome BBQ",
    referredBy: null,
    eventName: "Welcome BBQ",
    evidence: "Checked in.",
    notes: null,
    status: "removed",
    rejectionReason: "Not eligible.",
    promotedProspectId: null,
    createdAt: "2026-05-22T10:00:00Z",
    updatedAt: "2026-05-22T10:00:00Z",
  },
];

describe("intake helpers", () => {
  it("groups intake leads into stable review buckets", () => {
    const grouped = groupIntakeLeadsByStatus(leads);

    expect(Object.keys(grouped)).toEqual(intakeStatuses.map((status) => status.id));
    expect(grouped.needs_review.map((lead) => lead.id)).toEqual(["lead-1"]);
    expect(grouped.promoted.map((lead) => lead.id)).toEqual(["lead-2"]);
    expect(grouped.removed.map((lead) => lead.id)).toEqual(["lead-3"]);
  });

  it("maps intake leads from API shape", () => {
    const lead = mapApiIntakeLead({
      id: "lead-1",
      first_name: "Mason",
      last_name: "Rivera",
      preferred_name: "Mason",
      primary_handle: "@masonrivera",
      phone: "785-555-0142",
      email: "mason@example.com",
      hometown: "Topeka, KS",
      high_school: "Washburn Rural",
      interests: ["intramurals"],
      source_type: "member_referral",
      source_label: "Brother referral",
      referred_by: "Sam W.",
      event_name: null,
      evidence: "Sam met Mason at orientation.",
      notes: "Follow up.",
      status: "needs_review",
      rejection_reason: null,
      promoted_prospect_id: null,
      created_at: "2026-05-22T10:00:00Z",
      updated_at: "2026-05-22T10:00:00Z",
    });

    expect(lead.firstName).toBe("Mason");
    expect(lead.sourceType).toBe("member_referral");
    expect(lead.referredBy).toBe("Sam W.");
  });

  it("maps duplicate groups and CSV import results", () => {
    const duplicate = mapApiIntakeDuplicateGroup({
      identity_key: "handle:masonrivera",
      label: "@masonrivera",
      count: 2,
      statuses: ["needs_review", "promoted"],
      leads: [
        {
          id: "lead-1",
          first_name: "Mason",
          last_name: "Rivera",
          preferred_name: null,
          primary_handle: "@masonrivera",
          phone: null,
          email: null,
          hometown: null,
          high_school: null,
          interests: [],
          source_type: "member_referral",
          source_label: "Brother referral",
          referred_by: "Sam W.",
          event_name: null,
          evidence: "Referral.",
          notes: null,
          status: "needs_review",
          rejection_reason: null,
          promoted_prospect_id: null,
          created_at: "2026-05-22T10:00:00Z",
          updated_at: "2026-05-22T10:00:00Z",
        },
      ],
    });
    const imported = mapApiIntakeCsvImportResult({
      created_count: 1,
      skipped_count: 0,
      errors: [],
      created_leads: [
        {
          id: "lead-2",
          first_name: "Noah",
          last_name: "Bennett",
          preferred_name: null,
          primary_handle: "@noahb",
          phone: null,
          email: "noah@example.com",
          hometown: null,
          high_school: null,
          interests: ["basketball"],
          source_type: "csv_import",
          source_label: "CSV",
          referred_by: null,
          event_name: null,
          evidence: "Imported from CSV.",
          notes: null,
          status: "needs_review",
          rejection_reason: null,
          promoted_prospect_id: null,
          created_at: "2026-05-22T10:00:00Z",
          updated_at: "2026-05-22T10:00:00Z",
        },
      ],
    });

    expect(duplicate.identityKey).toBe("handle:masonrivera");
    expect(duplicate.leads).toHaveLength(1);
    expect(imported.createdCount).toBe(1);
    expect(imported.createdLeads[0].sourceType).toBe("csv_import");
  });

  it("summarizes intake metrics for dashboard cards", () => {
    const metrics = mapApiIntakeMetrics({
      total_leads: 3,
      needs_review: 1,
      promoted: 1,
      removed: 1,
      duplicate_groups: 2,
      source_mix: {
        member_referral: 1,
        opt_in: 1,
        event_check_in: 1,
        csv_import: 0,
        manual_entry: 0,
        public_source: 0,
      },
    });

    expect(getIntakeMetricsSummary(metrics)).toEqual({
      totalLeads: "3",
      needsReview: "1",
      promoted: "1",
      duplicateGroups: "2",
    });
  });
});
