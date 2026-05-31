import {
  CalendarClock,
  CheckCircle2,
  Database,
  Handshake,
  ListChecks,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  fetchProspects,
  getDashboardMetrics,
  groupProspectsByStatus,
  pipelineStatuses,
  type Prospect,
} from "@/lib/prospects";
import { IntakeConsole } from "@/components/intake-console";
import { fetchIntakeSnapshot } from "@/lib/intake";
import { RemoveProspectButton } from "@/components/remove-prospect-button";
import { authIsEnabled, SESSION_COOKIE_NAME, sessionIsValid } from "@/lib/auth";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  identified: "border-signal/30 bg-signal/10",
  researched: "border-moss/30 bg-moss/10",
  initial_contact: "border-brass/35 bg-brass/10",
  engaged: "border-signal/35 bg-signal/10",
  event_attended: "border-moss/35 bg-moss/10",
  strong_interest: "border-clay/35 bg-clay/10",
  bid_offered: "border-brass/40 bg-brass/10",
  accepted: "border-moss/45 bg-moss/15",
  declined: "border-ink/15 bg-ink/5",
  lost_contact: "border-clay/25 bg-clay/10",
  not_applicable: "border-ink/20 bg-ink/5",
};

function displayName(prospect: Prospect) {
  return prospect.preferredName || prospect.firstName;
}

function formatSourceLabel(source: string) {
  return source.replaceAll("_", " ");
}

function normalizeApiBaseUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value.replace(/\/$/, "");
  }
  return `http://${value.replace(/\/$/, "")}`;
}

function serverApiHeaders(): HeadersInit | undefined {
  const apiKey = process.env.RUSHINTEL_API_KEY;
  return apiKey ? { "X-RushIntel-Api-Key": apiKey } : undefined;
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  if (authIsEnabled() && !sessionIsValid(cookieStore.get(SESSION_COOKIE_NAME)?.value)) {
    redirect("/login");
  }

  const serverApiBaseUrl = normalizeApiBaseUrl(
    process.env.RUSHINTEL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL,
  );
  const browserApiBaseUrl = normalizeApiBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL || (serverApiBaseUrl ? "/api/backend" : undefined),
  );
  const prospects = await fetchProspects(serverApiBaseUrl, serverApiHeaders());
  const intake = await fetchIntakeSnapshot(serverApiBaseUrl, serverApiHeaders());
  const metrics = getDashboardMetrics(prospects);
  const grouped = groupProspectsByStatus(prospects);
  const dueSoon = prospects
    .filter((prospect) => prospect.followUpDate)
    .sort((left, right) => String(left.followUpDate).localeCompare(String(right.followUpDate)))
    .slice(0, 4);
  const topProspects = [...prospects]
    .sort((left, right) => right.rushScore - left.rushScore)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-field text-ink">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-ink/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-moss">
              RushIntel
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-ink">
              Kappa Sigma Recruitment
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-md border border-emerald/25 bg-white px-3 py-2 font-medium text-emerald shadow-panel">
              <ShieldCheck className="h-4 w-4" />
              Opt-in and referral first
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-brass/30 bg-white px-3 py-2 font-medium text-brass shadow-panel">
              <Database className="h-4 w-4" />
              Chapter handoff ready
            </span>
            {authIsEnabled() ? (
              <form action="/api/logout" method="post">
                <button className="rounded-md border border-ink/15 bg-white px-3 py-2 font-medium text-ink/65 shadow-panel">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={<Users className="h-5 w-5" />}
            label="Total prospects"
            value={metrics.totalProspects}
          />
          <MetricCard
            icon={<Handshake className="h-5 w-5" />}
            label="Active contacts"
            value={metrics.activeContacts}
          />
          <MetricCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="Overdue follow-ups"
            value={metrics.overdueFollowUps}
          />
          <MetricCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Event check-in rate"
            value={`${metrics.eventConversionRate}%`}
          />
        </section>

        <IntakeConsole
          apiBaseUrl={browserApiBaseUrl}
          initialLeads={intake.leads}
          initialDuplicateGroups={intake.duplicateGroups}
          initialMetrics={intake.metrics}
        />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pipeline</h2>
              <span className="text-sm font-medium text-ink/60">
                {pipelineStatuses.length} stages
              </span>
            </div>
            <div className="grid auto-rows-fr gap-3 md:grid-cols-2 xl:grid-cols-5">
              {pipelineStatuses.map((status) => (
                <section
                  key={status.id}
                  className={`min-h-40 rounded-md border p-3 ${statusTone[status.id]}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{status.label}</h3>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink/70">
                      {grouped[status.id].length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {grouped[status.id].slice(0, 3).map((prospect) => (
                      <ProspectMiniCard
                        key={prospect.id}
                        prospect={prospect}
                        apiBaseUrl={browserApiBaseUrl}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <Panel title="Follow-ups" icon={<CalendarClock className="h-4 w-4" />}>
              <div className="space-y-2">
                {dueSoon.map((prospect) => (
                  <div
                    key={prospect.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-ink/10 bg-white p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {displayName(prospect)}
                      </p>
                      <p className="text-xs text-ink/60">
                        {prospect.connectedMembers.length} warm ties
                      </p>
                    </div>
                    <time className="shrink-0 text-xs font-semibold text-brass">
                      {prospect.followUpDate}
                    </time>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Top prospects" icon={<UserPlus className="h-4 w-4" />}>
              <div className="space-y-2">
                {topProspects.map((prospect) => (
                  <div key={prospect.id} className="rounded-md bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{displayName(prospect)}</p>
                      <p className="text-sm font-bold text-signal">{prospect.rushScore}</p>
                    </div>
                    <p className="mt-1 text-xs text-ink/60">
                      {prospect.interests.slice(0, 2).join(" / ")}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Source mix" icon={<ListChecks className="h-4 w-4" />}>
              <div className="space-y-3">
                {Object.entries(metrics.sourceMix).map(([source, count]) => (
                  <div key={source}>
                    <div className="mb-1 flex justify-between text-xs font-semibold">
                      <span className="capitalize">{formatSourceLabel(source)}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-signal"
                        style={{
                          width: `${metrics.totalProspects === 0 ? 0 : (count / metrics.totalProspects) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Guardrails" icon={<ShieldCheck className="h-4 w-4" />}>
              <ul className="space-y-2 text-sm text-ink/75">
                <li className="rounded-md bg-white p-3">No automated direct messages.</li>
                <li className="rounded-md bg-white p-3">No private-content collection.</li>
                <li className="rounded-md bg-white p-3">Suppression before automation.</li>
              </ul>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-4 shadow-panel">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-signal/10 text-signal">
        {icon}
      </div>
      <p className="text-sm font-medium text-ink/60">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-ink/10 bg-white/70 p-4 shadow-panel">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-moss/10 text-moss">
          {icon}
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ProspectMiniCard({
  prospect,
  apiBaseUrl,
}: {
  prospect: Prospect;
  apiBaseUrl: string | undefined;
}) {
  return (
    <article className="rounded-md bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{displayName(prospect)}</p>
          <p className="truncate text-xs text-ink/55">{prospect.sourcePlatform}</p>
        </div>
        <span className="shrink-0 rounded-md bg-field px-2 py-1 text-xs font-bold text-signal">
          {prospect.rushScore}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {prospect.interests.slice(0, 2).map((interest) => (
          <span
            key={interest}
            className="rounded-md border border-ink/10 px-2 py-1 text-xs text-ink/65"
          >
            {interest}
          </span>
        ))}
      </div>
      {prospect.status !== "not_applicable" ? (
        <RemoveProspectButton apiBaseUrl={apiBaseUrl} prospectId={prospect.id} />
      ) : null}
    </article>
  );
}
