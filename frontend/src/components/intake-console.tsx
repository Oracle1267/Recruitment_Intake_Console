"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Handshake,
  ListChecks,
  Mail,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import {
  createIntakeLead,
  fetchIntakeSnapshot,
  formatIntakeSource,
  getIntakeMetricsSummary,
  groupIntakeLeadsByStatus,
  importIntakeCsv,
  intakeSourceOptions,
  intakeStatuses,
  promoteIntakeLead,
  updateIntakeLeadStatus,
  type IntakeDuplicateGroup,
  type IntakeLead,
  type IntakeMetrics,
  type IntakeSourceType,
} from "@/lib/intake";

type Props = {
  apiBaseUrl: string | undefined;
  initialLeads: IntakeLead[];
  initialDuplicateGroups: IntakeDuplicateGroup[];
  initialMetrics: IntakeMetrics;
};

const sampleCsv = "name,handle,email,interests,notes";

export function IntakeConsole({
  apiBaseUrl,
  initialLeads,
  initialDuplicateGroups,
  initialMetrics,
}: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [duplicateGroups, setDuplicateGroups] = useState(initialDuplicateGroups);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [sourceType, setSourceType] = useState<IntakeSourceType>("member_referral");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [primaryHandle, setPrimaryHandle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hometown, setHometown] = useState("");
  const [highSchool, setHighSchool] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [eventName, setEventName] = useState("");
  const [interests, setInterests] = useState("");
  const [evidence, setEvidence] = useState("");
  const [notes, setNotes] = useState("");
  const [csvSourceLabel, setCsvSourceLabel] = useState("");
  const [csvText, setCsvText] = useState(sampleCsv);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => groupIntakeLeadsByStatus(leads), [leads]);
  const metricSummary = useMemo(() => getIntakeMetricsSummary(metrics), [metrics]);
  const canMutate = Boolean(apiBaseUrl);

  async function refreshIntake() {
    if (!apiBaseUrl) {
      return;
    }
    const snapshot = await fetchIntakeSnapshot(apiBaseUrl);
    setLeads(snapshot.leads);
    setDuplicateGroups(snapshot.duplicateGroups);
    setMetrics(snapshot.metrics);
  }

  function interestList() {
    return interests
      .split(",")
      .map((interest) => interest.trim())
      .filter(Boolean);
  }

  async function submitLead() {
    if (!apiBaseUrl) {
      setMessage("Set NEXT_PUBLIC_API_BASE_URL to save intake leads.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await createIntakeLead({
        apiBaseUrl,
        firstName,
        lastName,
        preferredName: firstName,
        primaryHandle,
        phone,
        email,
        hometown,
        highSchool,
        interests: interestList(),
        sourceType,
        sourceLabel,
        referredBy,
        eventName,
        evidence,
        notes,
      });
      await refreshIntake();
      setMessage("Intake lead added to review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Intake save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCsv() {
    if (!apiBaseUrl) {
      setMessage("Set NEXT_PUBLIC_API_BASE_URL to import CSV intake leads.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await importIntakeCsv({
        apiBaseUrl,
        sourceLabel: csvSourceLabel,
        csvText,
      });
      await refreshIntake();
      setMessage(
        `Imported ${result.createdCount} leads. Skipped ${result.skippedCount}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CSV import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function reviewLead(
    leadId: string,
    status: "rejected" | "removed",
    reason: string,
  ) {
    if (!apiBaseUrl) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await updateIntakeLeadStatus(apiBaseUrl, leadId, status, reason);
      await refreshIntake();
      setMessage(status === "removed" ? "Lead moved to Removed / N/A." : "Lead rejected.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function promoteLead(leadId: string) {
    if (!apiBaseUrl) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await promoteIntakeLead(apiBaseUrl, leadId);
      await refreshIntake();
      setMessage("Lead promoted into the prospect pipeline.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Promotion failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-panel">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-scarlet text-lg font-black text-white">
            KΣ
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald">
              Kappa Sigma
            </p>
            <h2 className="text-xl font-semibold">Rush Tracker</h2>
          </div>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-4 lg:w-[620px]">
          <IntakeMetric icon={<Users className="h-4 w-4" />} label="Leads" value={metricSummary.totalLeads} />
          <IntakeMetric icon={<ClipboardList className="h-4 w-4" />} label="Review" value={metricSummary.needsReview} />
          <IntakeMetric icon={<CheckCircle2 className="h-4 w-4" />} label="Promoted" value={metricSummary.promoted} />
          <IntakeMetric icon={<ListChecks className="h-4 w-4" />} label="Dupes" value={metricSummary.duplicateGroups} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-md border border-ink/10 bg-field p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="h-4 w-4 text-scarlet" />
              Add intake lead
            </div>
            <div className="space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                />
                <input
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                  value={primaryHandle}
                  onChange={(event) => setPrimaryHandle(event.target.value)}
                  placeholder="@handle"
                />
                <input
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Phone"
                />
                <input
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                  value={hometown}
                  onChange={(event) => setHometown(event.target.value)}
                  placeholder="Hometown"
                />
              </div>
              <input
                className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                value={highSchool}
                onChange={(event) => setHighSchool(event.target.value)}
                placeholder="High school"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                  value={sourceType}
                  onChange={(event) => setSourceType(event.target.value as IntakeSourceType)}
                >
                  {intakeSourceOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                  value={sourceLabel}
                  onChange={(event) => setSourceLabel(event.target.value)}
                  placeholder="Source label"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                  value={referredBy}
                  onChange={(event) => setReferredBy(event.target.value)}
                  placeholder="Referred by"
                />
                <input
                  className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                  value={eventName}
                  onChange={(event) => setEventName(event.target.value)}
                  placeholder="Event name"
                />
              </div>
              <input
                className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                value={interests}
                onChange={(event) => setInterests(event.target.value)}
                placeholder="Interests, comma separated"
              />
              <textarea
                className="min-h-20 w-full resize-y rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                value={evidence}
                onChange={(event) => setEvidence(event.target.value)}
                placeholder="Why this lead belongs in review"
              />
              <textarea
                className="min-h-20 w-full resize-y rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-scarlet"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Chapter notes"
              />
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-scarlet px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
                type="button"
                disabled={busy || !canMutate}
                onClick={submitLead}
              >
                <Handshake className="h-4 w-4" />
                Add to intake
              </button>
            </div>
          </div>

          <div className="rounded-md border border-ink/10 bg-field p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileSpreadsheet className="h-4 w-4 text-emerald" />
              CSV intake import
            </div>
            <div className="space-y-2">
              <input
                className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-emerald"
                value={csvSourceLabel}
                onChange={(event) => setCsvSourceLabel(event.target.value)}
                placeholder="CSV source label"
              />
              <textarea
                className="min-h-32 w-full resize-y rounded-md border border-ink/15 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-emerald"
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                placeholder="Paste CSV rows"
              />
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
                type="button"
                disabled={busy || !canMutate}
                onClick={submitCsv}
              >
                <UploadCloud className="h-4 w-4" />
                Import CSV
              </button>
            </div>
          </div>

          <div className="rounded-md border border-brass/30 bg-white p-3 text-xs leading-5 text-ink/70">
            <div className="mb-1 flex items-center gap-2 font-semibold text-emerald">
              <ShieldCheck className="h-4 w-4" />
              Chapter handoff boundary
            </div>
            Intake should come from member referrals, opt-in forms, event check-ins,
            chapter-approved sheets, or manual notes. Keep private content and mass
            messaging outside this system.
          </div>
          {message ? <p className="text-sm font-medium text-scarlet">{message}</p> : null}
          {!canMutate ? (
            <p className="text-xs text-ink/60">API URL not configured; showing demo intake data.</p>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{leads.length} intake leads</p>
              <p className="text-xs text-ink/55">
                {duplicateGroups.length} duplicate groups require review
              </p>
            </div>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink/15 text-ink/70 disabled:opacity-50"
              type="button"
              disabled={busy || !canMutate}
              onClick={refreshIntake}
              title="Refresh intake"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {intakeStatuses.map((status) => (
              <section
                key={status.id}
                className="min-h-44 rounded-md border border-ink/10 bg-field p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{status.label}</h3>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold">
                    {grouped[status.id].length}
                  </span>
                </div>
                <div className="space-y-2">
                  {grouped[status.id].slice(0, 4).map((lead) => (
                    <IntakeLeadCard
                      key={lead.id}
                      lead={lead}
                      disabled={busy || !canMutate}
                      onPromote={() => promoteLead(lead.id)}
                      onReject={() =>
                        reviewLead(lead.id, "rejected", "Rejected after intake review.")
                      }
                      onRemove={() =>
                        reviewLead(lead.id, "removed", "Determined N/A after chapter review.")
                      }
                    />
                  ))}
                  {grouped[status.id].length === 0 ? (
                    <p className="rounded-md bg-white p-3 text-sm text-ink/55">
                      No leads in this bucket.
                    </p>
                  ) : null}
                </div>
              </section>
            ))}
          </div>

          <section className="rounded-md border border-ink/10 bg-field p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-emerald" />
              Duplicate review
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {duplicateGroups.slice(0, 4).map((group) => (
                <div key={group.identityKey} className="rounded-md bg-white p-3">
                  <p className="truncate text-sm font-semibold">
                    {group.label} / {group.count} matches
                  </p>
                  <p className="mt-1 text-xs text-ink/60">
                    {group.statuses.map((status) => status.replace("_", " ")).join(" / ")}
                  </p>
                </div>
              ))}
              {duplicateGroups.length === 0 ? (
                <p className="rounded-md bg-white p-3 text-sm text-ink/55">
                  No duplicate identities detected.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function IntakeMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-field px-3 py-2">
      <div className="mb-1 flex items-center gap-1 text-xs text-ink/55">
        {icon}
        {label}
      </div>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function IntakeLeadCard({
  lead,
  disabled,
  onPromote,
  onReject,
  onRemove,
}: {
  lead: IntakeLead;
  disabled: boolean;
  onPromote: () => void;
  onReject: () => void;
  onRemove: () => void;
}) {
  const name = `${lead.preferredName || lead.firstName} ${lead.lastName || ""}`.trim();
  return (
    <article className="rounded-md bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-ink/55">
            {formatIntakeSource(lead.sourceType)} / {lead.sourceLabel}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-scarlet/10 px-2 py-1 text-xs font-bold text-scarlet">
          {lead.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-xs text-ink/60">
        {lead.primaryHandle ? (
          <span className="rounded-md border border-ink/10 px-2 py-1">
            {lead.primaryHandle}
          </span>
        ) : null}
        {lead.email ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-ink/10 px-2 py-1">
            <Mail className="h-3 w-3" />
            {lead.email}
          </span>
        ) : null}
        {lead.referredBy ? (
          <span className="rounded-md border border-emerald/20 px-2 py-1">
            {lead.referredBy}
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/70">{lead.evidence}</p>
      {lead.status === "needs_review" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-1 rounded-md border border-emerald/25 px-2 py-1 text-xs font-semibold text-emerald disabled:opacity-50"
            type="button"
            disabled={disabled}
            onClick={onPromote}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Promote
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-md border border-clay/25 px-2 py-1 text-xs font-semibold text-clay disabled:opacity-50"
            type="button"
            disabled={disabled}
            onClick={onReject}
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-md border border-ink/15 px-2 py-1 text-xs font-semibold text-ink/65 disabled:opacity-50"
            type="button"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      ) : null}
    </article>
  );
}
