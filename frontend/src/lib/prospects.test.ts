import { describe, expect, it } from "vitest";

import {
  getDashboardMetrics,
  groupProspectsByStatus,
  pipelineStatuses,
  type Prospect,
} from "./prospects";

const prospects: Prospect[] = [
  {
    id: "prospect-1",
    firstName: "Avery",
    preferredName: "Avery",
    sourcePlatform: "TikTok",
    collectionMethod: "manual",
    permissionConfirmed: true,
    status: "identified",
    rushScore: 72,
    interests: ["orientation"],
    lastContact: "2026-05-20",
    followUpDate: "2026-05-21",
    connectedMembers: ["Sam"],
    eventAttendanceCount: 0,
    sourceType: "member_referral",
  },
  {
    id: "prospect-2",
    firstName: "Jordan",
    preferredName: "Jordan",
    sourcePlatform: "Manual",
    collectionMethod: "manual",
    permissionConfirmed: true,
    status: "event_attended",
    rushScore: 88,
    interests: ["basketball"],
    lastContact: "2026-05-22",
    followUpDate: "2026-06-01",
    connectedMembers: ["Ty", "Marcus"],
    eventAttendanceCount: 2,
    sourceType: "event_check_in",
  },
  {
    id: "prospect-3",
    firstName: "Avery",
    preferredName: "Avery",
    sourcePlatform: "Manual note",
    collectionMethod: "assisted",
    permissionConfirmed: true,
    status: "not_applicable",
    rushScore: 82,
    interests: ["orientation"],
    lastContact: null,
    followUpDate: null,
    connectedMembers: [],
    eventAttendanceCount: 0,
    sourceType: "manual_entry",
  },
];

describe("groupProspectsByStatus", () => {
  it("creates a stable bucket for every pipeline status", () => {
    const grouped = groupProspectsByStatus(prospects);

    expect(Object.keys(grouped)).toEqual(pipelineStatuses.map((status) => status.id));
    expect(grouped.identified.map((prospect) => prospect.id)).toEqual(["prospect-1"]);
    expect(grouped.event_attended.map((prospect) => prospect.id)).toEqual(["prospect-2"]);
    expect(grouped.not_applicable.map((prospect) => prospect.id)).toEqual(["prospect-3"]);
    expect(grouped.accepted).toEqual([]);
  });
});

describe("getDashboardMetrics", () => {
  it("summarizes active contacts, overdue follow-ups, source mix, and event conversion", () => {
    const metrics = getDashboardMetrics(prospects, new Date("2026-05-22T12:00:00Z"));

    expect(metrics.totalProspects).toBe(3);
    expect(metrics.activeContacts).toBe(2);
    expect(metrics.overdueFollowUps).toBe(1);
    expect(metrics.eventConversionRate).toBe(33);
    expect(metrics.sourceMix).toEqual({
      member_referral: 1,
      opt_in: 0,
      event_check_in: 1,
      csv_import: 0,
      manual_entry: 1,
    });
  });
});
