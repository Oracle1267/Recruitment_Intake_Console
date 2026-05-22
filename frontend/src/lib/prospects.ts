export type RecruitmentStatus =
  | "identified"
  | "researched"
  | "initial_contact"
  | "engaged"
  | "event_attended"
  | "strong_interest"
  | "bid_offered"
  | "accepted"
  | "declined"
  | "lost_contact"
  | "not_applicable";

export type SourceType =
  | "member_referral"
  | "opt_in"
  | "event_check_in"
  | "csv_import"
  | "manual_entry";

export type CollectionMethod = "manual" | "assisted";

export type Prospect = {
  id: string;
  firstName: string;
  lastName?: string | null;
  preferredName?: string | null;
  sourcePlatform: string;
  sourceUrl?: string | null;
  primaryHandle?: string | null;
  collectionMethod: CollectionMethod;
  permissionConfirmed: boolean;
  status: RecruitmentStatus;
  rushScore: number;
  interests: string[];
  lastContact?: string | null;
  followUpDate?: string | null;
  connectedMembers: string[];
  eventAttendanceCount: number;
  sourceType: SourceType;
};

export type ApiProspect = {
  id: string;
  first_name: string;
  last_name: string | null;
  preferred_name: string | null;
  source_platform: string;
  primary_handle: string | null;
  source_url: string | null;
  collection_method: CollectionMethod;
  permission_confirmed: boolean;
  status: RecruitmentStatus;
  rush_score: number;
  interests: string[];
};

export const pipelineStatuses: Array<{ id: RecruitmentStatus; label: string }> = [
  { id: "identified", label: "Identified" },
  { id: "researched", label: "Researched" },
  { id: "initial_contact", label: "Initial Contact" },
  { id: "engaged", label: "Engaged" },
  { id: "event_attended", label: "Event Attended" },
  { id: "strong_interest", label: "Strong Interest" },
  { id: "bid_offered", label: "Bid Offered" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" },
  { id: "lost_contact", label: "Lost Contact" },
  { id: "not_applicable", label: "Removed / N/A" },
];

export type ProspectGroups = Record<RecruitmentStatus, Prospect[]>;

export type DashboardMetrics = {
  totalProspects: number;
  activeContacts: number;
  overdueFollowUps: number;
  eventConversionRate: number;
  sourceMix: Record<SourceType, number>;
};

const inactiveStatuses = new Set<RecruitmentStatus>([
  "accepted",
  "declined",
  "lost_contact",
  "not_applicable",
]);

export function groupProspectsByStatus(prospects: Prospect[]): ProspectGroups {
  const groups = pipelineStatuses.reduce((accumulator, status) => {
    accumulator[status.id] = [];
    return accumulator;
  }, {} as ProspectGroups);

  for (const prospect of prospects) {
    groups[prospect.status].push(prospect);
  }

  return groups;
}

export function getDashboardMetrics(
  prospects: Prospect[],
  now: Date = new Date(),
): DashboardMetrics {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  const activeContacts = prospects.filter(
    (prospect) => !inactiveStatuses.has(prospect.status),
  ).length;
  const overdueFollowUps = prospects.filter((prospect) => {
    if (!prospect.followUpDate || inactiveStatuses.has(prospect.status)) {
      return false;
    }
    return new Date(`${prospect.followUpDate}T00:00:00Z`) < today;
  }).length;
  const eventAttendees = prospects.filter(
    (prospect) => prospect.eventAttendanceCount > 0,
  ).length;

  return {
    totalProspects: prospects.length,
    activeContacts,
    overdueFollowUps,
    eventConversionRate:
      prospects.length === 0 ? 0 : Math.round((eventAttendees / prospects.length) * 100),
    sourceMix: prospects.reduce(
      (mix, prospect) => {
        mix[prospect.sourceType] += 1;
        return mix;
      },
      {
        member_referral: 0,
        opt_in: 0,
        event_check_in: 0,
        csv_import: 0,
        manual_entry: 0,
      } as Record<SourceType, number>,
    ),
  };
}

export function inferProspectSourceType(sourcePlatform: string): SourceType {
  const normalized = sourcePlatform.toLowerCase();
  if (normalized.includes("member") || normalized.includes("referral")) {
    return "member_referral";
  }
  if (normalized.includes("opt")) {
    return "opt_in";
  }
  if (normalized.includes("event") || normalized.includes("check")) {
    return "event_check_in";
  }
  if (normalized.includes("csv")) {
    return "csv_import";
  }
  return "manual_entry";
}

export function mapApiProspect(prospect: ApiProspect): Prospect {
  return {
    id: prospect.id,
    firstName: prospect.first_name,
    lastName: prospect.last_name,
    preferredName: prospect.preferred_name,
    sourcePlatform: prospect.source_platform,
    primaryHandle: prospect.primary_handle,
    sourceUrl: prospect.source_url,
    collectionMethod: prospect.collection_method,
    permissionConfirmed: prospect.permission_confirmed,
    status: prospect.status,
    rushScore: prospect.rush_score,
    interests: prospect.interests,
    lastContact: null,
    followUpDate: null,
    connectedMembers: [],
    eventAttendanceCount: 0,
    sourceType: inferProspectSourceType(prospect.source_platform),
  };
}

export async function fetchProspects(): Promise<Prospect[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return demoProspects;
  }

  try {
    const response = await fetch(`${baseUrl}/prospects`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return demoProspects;
    }
    const prospects = (await response.json()) as ApiProspect[];
    return prospects.map(mapApiProspect);
  } catch {
    return demoProspects;
  }
}

export async function removeProspect(
  apiBaseUrl: string,
  prospectId: string,
  reason = "Determined N/A after later review.",
) {
  const response = await fetch(`${apiBaseUrl}/prospects/${prospectId}/remove`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    try {
      const payload = (await response.json()) as { detail?: string };
      throw new Error(payload.detail ?? `Request failed with ${response.status}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Request failed with ${response.status}`);
    }
  }
}

export const demoProspects: Prospect[] = [
];
