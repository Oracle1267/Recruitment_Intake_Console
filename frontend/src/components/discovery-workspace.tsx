"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  ExternalLink,
  FileSearch,
  Gauge,
  Layers2,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";

import {
  buildGoogleSearchUrl,
  candidateStatuses,
  createSavedSearchQuery,
  createSourceAndRunDiscovery,
  createSourceAtlasEntry,
  archiveSourceAtlasEntry,
  deleteSavedSearchQuery,
  fetchDiscoverySnapshot,
  fetchSourceAtlasSnapshot,
  fetchSourceExpansionSnapshot,
  formatDuplicateGroupLabel,
  getCandidateMetrics,
  getExpansionMetrics,
  getSourceAtlasMetrics,
  groupCandidatesByStatus,
  importPublicResults,
  promoteCandidate,
  seedWashburnSourcePack,
  updateCandidateReview,
  type CandidateDuplicateGroup,
  type CandidateLead,
  type DiscoveryCoverage,
  type DiscoverySource,
  type DiscoverySourceType,
  type SavedSearchQuery,
  type SourceAtlasCategory,
  type SourceAtlasEntry,
  type SourceAtlasReportItem,
} from "@/lib/discovery";

const samplePublicHtml = `<p>Avery Cole is an incoming freshman at Washburn University and plays volleyball. Instagram @averycole.</p>
<p>Jordan Hayes joined the public orientation Discord and posted about move-in week.</p>`;

type Props = {
  apiBaseUrl: string | undefined;
  initialSources: DiscoverySource[];
  initialCandidates: CandidateLead[];
  initialSavedQueries: SavedSearchQuery[];
  initialDuplicateGroups: CandidateDuplicateGroup[];
  initialCoverage: DiscoveryCoverage;
  initialSourceAtlasEntries: SourceAtlasEntry[];
  initialSourceAtlasReport: SourceAtlasReportItem[];
};

export function DiscoveryWorkspace({
  apiBaseUrl,
  initialSources,
  initialCandidates,
  initialSavedQueries,
  initialDuplicateGroups,
  initialCoverage,
  initialSourceAtlasEntries,
  initialSourceAtlasReport,
}: Props) {
  const [sources, setSources] = useState(initialSources);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [savedQueries, setSavedQueries] = useState(initialSavedQueries);
  const [duplicateGroups, setDuplicateGroups] = useState(initialDuplicateGroups);
  const [coverage, setCoverage] = useState(initialCoverage);
  const [sourceAtlasEntries, setSourceAtlasEntries] = useState(initialSourceAtlasEntries);
  const [sourceAtlasReport, setSourceAtlasReport] = useState(initialSourceAtlasReport);
  const [atlasName, setAtlasName] = useState("Washburn football roster");
  const [atlasUrl, setAtlasUrl] = useState("https://wusports.com/sports/football/roster");
  const [atlasCategory, setAtlasCategory] = useState<SourceAtlasCategory>("athletics");
  const [atlasSourceType, setAtlasSourceType] =
    useState<DiscoverySourceType>("athletics_roster");
  const [atlasSourcePlatform, setAtlasSourcePlatform] = useState("WUsports");
  const [atlasPriority, setAtlasPriority] = useState("5");
  const [atlasCadenceDays, setAtlasCadenceDays] = useState("14");
  const [selectedAtlasEntryId, setSelectedAtlasEntryId] = useState(
    initialSourceAtlasEntries[0]?.id ?? "",
  );
  const [expectedMalePool, setExpectedMalePool] = useState(
    String(initialCoverage.expectedMalePool),
  );
  const [queryLabel, setQueryLabel] = useState("Washburn incoming class search");
  const [queryText, setQueryText] = useState('"Washburn University" "incoming freshman"');
  const [querySourceUrl, setQuerySourceUrl] = useState(
    buildGoogleSearchUrl('"Washburn University" "incoming freshman"'),
  );
  const [querySourceUrlManuallyEdited, setQuerySourceUrlManuallyEdited] = useState(false);
  const [querySourceType, setQuerySourceType] =
    useState<DiscoverySourceType>("public_web_page");
  const [querySourcePlatform, setQuerySourcePlatform] = useState("Search");
  const [selectedQueryId, setSelectedQueryId] = useState(initialSavedQueries[0]?.id ?? "");
  const [importName, setImportName] = useState("Manual public result paste");
  const [importUrl, setImportUrl] = useState(
    initialSavedQueries[0]?.sourceUrl ??
      "https://www.google.com/search?q=Washburn+incoming+freshman",
  );
  const [importSourceType, setImportSourceType] =
    useState<DiscoverySourceType>("public_web_page");
  const [importSourcePlatform, setImportSourcePlatform] = useState("Search");
  const [pastedResults, setPastedResults] = useState(
    "Noah Bennett announced he is an incoming freshman at Washburn University.\nMicah Reed committed to Washburn and posted about orientation week.",
  );
  const [name, setName] = useState("Washburn public orientation page");
  const [url, setUrl] = useState("https://example.edu/orientation");
  const [sourceType, setSourceType] = useState<DiscoverySourceType>("orientation_page");
  const [sourcePlatform, setSourcePlatform] = useState("Public web");
  const [htmlOverride, setHtmlOverride] = useState(samplePublicHtml);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => groupCandidatesByStatus(candidates), [candidates]);
  const metrics = useMemo(() => getCandidateMetrics(candidates), [candidates]);
  const expansionMetrics = useMemo(
    () =>
      getExpansionMetrics({
        savedQueryCount: savedQueries.length,
        duplicateGroupCount: duplicateGroups.length,
        coverage,
      }),
    [coverage, duplicateGroups.length, savedQueries.length],
  );
  const sourceAtlasMetrics = useMemo(
    () => getSourceAtlasMetrics(sourceAtlasReport),
    [sourceAtlasReport],
  );
  const canMutate = Boolean(apiBaseUrl);

  function expectedPoolValue() {
    const parsed = Number.parseInt(expectedMalePool, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 430;
  }

  function updateQueryText(value: string) {
    setQueryText(value);
    if (!querySourceUrlManuallyEdited) {
      setQuerySourceUrl(buildGoogleSearchUrl(value));
    }
  }

  function syncQuerySourceUrl() {
    const generatedUrl = buildGoogleSearchUrl(queryText);
    setQuerySourceUrl(generatedUrl);
    setImportUrl(generatedUrl);
    setQuerySourceUrlManuallyEdited(false);
  }

  async function refresh() {
    if (!apiBaseUrl) {
      return;
    }
    const snapshot = await fetchDiscoverySnapshot(apiBaseUrl);
    setSources(snapshot.sources);
    setCandidates(snapshot.candidates);
  }

  async function refreshExpansion() {
    if (!apiBaseUrl) {
      return;
    }
    const snapshot = await fetchSourceExpansionSnapshot(apiBaseUrl, expectedPoolValue());
    setSavedQueries(snapshot.savedQueries);
    setDuplicateGroups(snapshot.duplicateGroups);
    setCoverage(snapshot.coverage);
  }

  async function refreshSourceAtlas() {
    if (!apiBaseUrl) {
      return;
    }
    const snapshot = await fetchSourceAtlasSnapshot(apiBaseUrl);
    setSourceAtlasEntries(snapshot.entries);
    setSourceAtlasReport(snapshot.report);
  }

  async function refreshAll() {
    await Promise.all([refresh(), refreshExpansion(), refreshSourceAtlas()]);
  }

  async function addAtlasSource() {
    if (!apiBaseUrl) {
      setMessage("Set NEXT_PUBLIC_API_BASE_URL to save source atlas entries.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const entry = await createSourceAtlasEntry({
        apiBaseUrl,
        name: atlasName,
        url: atlasUrl,
        category: atlasCategory,
        sourceType: atlasSourceType,
        sourcePlatform: atlasSourcePlatform,
        priority: Number.parseInt(atlasPriority, 10) || 3,
        reviewCadenceDays: Number.parseInt(atlasCadenceDays, 10) || 14,
        notes: "Saved from Source Atlas Console.",
      });
      setSelectedAtlasEntryId(entry.id);
      setImportName(`${entry.name} import`);
      setImportUrl(entry.url);
      setImportSourceType(entry.sourceType);
      setImportSourcePlatform(entry.sourcePlatform);
      await refreshSourceAtlas();
      setMessage("Saved source atlas entry.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Source atlas save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadWashburnSourcePack() {
    if (!apiBaseUrl) {
      setMessage("Set NEXT_PUBLIC_API_BASE_URL to load the Washburn source pack.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await seedWashburnSourcePack(apiBaseUrl);
      await Promise.all([refreshSourceAtlas(), refreshExpansion()]);
      setMessage(
        `Loaded ${result.atlasSourcesCreated} source surfaces and ${result.savedSearchesCreated} searches. Skipped ${result.atlasSourcesSkipped + result.savedSearchesSkipped} existing items.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Washburn source pack failed.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveAtlasSource(entryId: string) {
    if (!apiBaseUrl) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await archiveSourceAtlasEntry(apiBaseUrl, entryId);
      if (selectedAtlasEntryId === entryId) {
        setSelectedAtlasEntryId("");
      }
      await refreshSourceAtlas();
      setMessage("Archived source atlas entry.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Source atlas archive failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSearchQuery() {
    if (!apiBaseUrl) {
      setMessage("Set NEXT_PUBLIC_API_BASE_URL to save source expansion queries.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const saved = await createSavedSearchQuery({
        apiBaseUrl,
        label: queryLabel,
        query: queryText,
        sourceType: querySourceType,
        sourcePlatform: querySourcePlatform,
        sourceUrl: querySourceUrl,
        notes: "Saved from Source Expansion Console.",
      });
      setSelectedQueryId(saved.id);
      setImportUrl(saved.sourceUrl);
      setImportSourceType(saved.sourceType);
      setImportSourcePlatform(saved.sourcePlatform);
      await refreshExpansion();
      setMessage("Saved public search recipe.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search query save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedQuery() {
    if (!apiBaseUrl || !selectedQueryId) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await deleteSavedSearchQuery(apiBaseUrl, selectedQueryId);
      setSelectedQueryId("");
      await refreshExpansion();
      setMessage("Removed saved search from the import list.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Saved search removal failed.");
    } finally {
      setBusy(false);
    }
  }

  async function importResults() {
    if (!apiBaseUrl) {
      setMessage("Set NEXT_PUBLIC_API_BASE_URL to import public result snippets.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const batch = await importPublicResults({
        apiBaseUrl,
        savedSearchQueryId: selectedQueryId || null,
        sourceAtlasEntryId: selectedAtlasEntryId || null,
        name: importName,
        url: importUrl,
        sourceType: importSourceType,
        sourcePlatform: importSourcePlatform,
        pastedResults,
        notes: "Pasted public result snippets from Source Expansion Console.",
      });
      await refreshAll();
      setMessage(`Imported ${batch.candidatesCreated} candidate leads for review.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Source import failed.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshExpansionFromPool() {
    setBusy(true);
    try {
      await refreshExpansion();
    } finally {
      setBusy(false);
    }
  }

  function chooseSavedQuery(queryId: string) {
    setSelectedQueryId(queryId);
    const query = savedQueries.find((savedQuery) => savedQuery.id === queryId);
    if (!query) {
      return;
    }
    setImportName(`${query.label} import`);
    setImportUrl(query.sourceUrl);
    setImportSourceType(query.sourceType);
    setImportSourcePlatform(query.sourcePlatform);
  }

  function chooseAtlasSource(entryId: string) {
    setSelectedAtlasEntryId(entryId);
    const entry = sourceAtlasEntries.find((atlasEntry) => atlasEntry.id === entryId);
    if (!entry) {
      return;
    }
    setImportName(`${entry.name} import`);
    setImportUrl(entry.url);
    setImportSourceType(entry.sourceType);
    setImportSourcePlatform(entry.sourcePlatform);
  }

  async function runPublicDiscovery() {
    if (!apiBaseUrl) {
      setMessage("Set NEXT_PUBLIC_API_BASE_URL to run discovery against the backend.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const run = await createSourceAndRunDiscovery({
        apiBaseUrl,
        name,
        url,
        sourceType,
        sourcePlatform,
        htmlOverride,
      });
      await refreshAll();
      setMessage(`Discovery run completed with ${run.candidates_found} candidate leads.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Discovery failed.");
    } finally {
      setBusy(false);
    }
  }

  async function review(candidateId: string, status: "approved" | "rejected" | "removed") {
    if (!apiBaseUrl) {
      return;
    }
    setBusy(true);
    try {
      await updateCandidateReview(
        apiBaseUrl,
        candidateId,
        status,
        status === "rejected"
          ? "Rejected from Discovery Inbox review."
          : status === "removed"
            ? "Determined N/A after later review."
            : undefined,
      );
      await refreshAll();
    } finally {
      setBusy(false);
    }
  }

  async function promote(candidateId: string) {
    if (!apiBaseUrl) {
      return;
    }
    setBusy(true);
    try {
      await promoteCandidate(apiBaseUrl, candidateId);
      await refreshAll();
      setMessage("Candidate promoted into the CRM pipeline.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Promotion failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-panel">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-signal/10 text-signal">
              <Compass className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-moss">
                Discovery Inbox
              </p>
              <h2 className="text-xl font-semibold">Public-source candidate review</h2>
            </div>
          </div>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-4 lg:w-[520px]">
          <DiscoveryMetric label="Candidates" value={metrics.totalCandidates} />
          <DiscoveryMetric label="Needs Review" value={metrics.needsReview} />
          <DiscoveryMetric label="Approved" value={metrics.approved} />
          <DiscoveryMetric label="Avg Confidence" value={metrics.averageConfidence} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="xl:col-span-2">
          <div className="rounded-md border border-ink/10 bg-field p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-signal/10 text-signal">
                  <Layers2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-moss">
                    Source Atlas
                  </p>
                  <h3 className="text-lg font-semibold">Source-first collection map</h3>
                </div>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-4 lg:w-[620px]">
                <DiscoveryMetric label="Sources" value={sourceAtlasMetrics.sourceCount} />
                <DiscoveryMetric label="Imports" value={sourceAtlasMetrics.importCount} />
                <DiscoveryMetric label="Candidates" value={sourceAtlasMetrics.totalCandidates} />
                <DiscoveryMetric label="Yield" value={sourceAtlasMetrics.yieldLabel} />
              </div>
            </div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
                type="button"
                disabled={busy || !canMutate}
                onClick={loadWashburnSourcePack}
              >
                <Sparkles className="h-4 w-4" />
                Load Washburn source pack
              </button>
              {message ? <p className="text-sm font-medium text-signal">{message}</p> : null}
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-md border border-ink/10 bg-white p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <PlusCircle className="h-4 w-4 text-signal" />
                  Add source surface
                </div>
                <div className="space-y-2">
                  <input
                    className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                    value={atlasName}
                    onChange={(event) => setAtlasName(event.target.value)}
                    placeholder="Source name"
                  />
                  <input
                    className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                    value={atlasUrl}
                    onChange={(event) => setAtlasUrl(event.target.value)}
                    placeholder="Public source URL"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                      value={atlasCategory}
                      onChange={(event) => setAtlasCategory(event.target.value as SourceAtlasCategory)}
                    >
                      <SourceAtlasCategoryOptions />
                    </select>
                    <SourceTypeSelect
                      value={atlasSourceType}
                      onChange={setAtlasSourceType}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_80px_80px]">
                    <input
                      className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                      value={atlasSourcePlatform}
                      onChange={(event) => setAtlasSourcePlatform(event.target.value)}
                      placeholder="Platform"
                    />
                    <input
                      className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                      value={atlasPriority}
                      onChange={(event) => setAtlasPriority(event.target.value)}
                      placeholder="Priority"
                    />
                    <input
                      className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                      value={atlasCadenceDays}
                      onChange={(event) => setAtlasCadenceDays(event.target.value)}
                      placeholder="Days"
                    />
                  </div>
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
                    type="button"
                    disabled={busy || !canMutate}
                    onClick={addAtlasSource}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add source
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-ink/10 bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Gauge className="h-4 w-4 text-signal" />
                    Source yield
                  </div>
                  <span className="text-xs font-semibold text-ink/55">
                    {sourceAtlasEntries.length} active
                  </span>
                </div>
                <div className="grid gap-2 lg:grid-cols-2">
                  {sourceAtlasReport.slice(0, 4).map((item) => (
                    <div
                      key={item.source.id}
                      className="rounded-md border border-ink/10 bg-field p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.source.name}</p>
                          <p className="text-xs capitalize text-ink/60">
                            {item.source.category.replace("_", " ")} / priority{" "}
                            {item.source.priority}
                          </p>
                        </div>
                        <button
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ink/15 text-ink/65 disabled:opacity-50"
                          type="button"
                          disabled={busy || !canMutate || item.source.status === "archived"}
                          onClick={() => archiveAtlasSource(item.source.id)}
                          title="Archive source"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <MiniStat label="Imports" value={item.importCount} />
                        <MiniStat label="Leads" value={item.usableLeads} />
                        <MiniStat label="Total" value={item.totalCandidates} />
                      </div>
                    </div>
                  ))}
                  {sourceAtlasReport.length === 0 ? (
                    <p className="rounded-md border border-ink/10 bg-field p-3 text-sm text-ink/60">
                      Add source surfaces to start measuring yield.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="rounded-md border border-ink/10 bg-field p-4">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-moss/10 text-moss">
                  <Search className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-moss">
                    Source Expansion
                  </p>
                  <h3 className="text-lg font-semibold">Public search recipes and imports</h3>
                </div>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-4 lg:w-[560px]">
                <DiscoveryMetric label="Saved Searches" value={expansionMetrics.savedQueryCount} />
                <DiscoveryMetric label="Usable Leads" value={expansionMetrics.uniqueLeadLabel} />
                <DiscoveryMetric label="Coverage" value={expansionMetrics.coverageLabel} />
                <DiscoveryMetric label="Dupes" value={expansionMetrics.duplicateGroupCount} />
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_320px]">
              <div className="rounded-md border border-ink/10 bg-white p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <PlusCircle className="h-4 w-4 text-signal" />
                  Save search
                </div>
                <div className="space-y-2">
                  <input
                    className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                    value={queryLabel}
                    onChange={(event) => setQueryLabel(event.target.value)}
                    placeholder="Search label"
                  />
                  <input
                    className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                    value={queryText}
                    onChange={(event) => updateQueryText(event.target.value)}
                    placeholder="Search query"
                  />
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                      value={querySourceUrl}
                      onChange={(event) => {
                        setQuerySourceUrl(event.target.value);
                        setQuerySourceUrlManuallyEdited(true);
                      }}
                      placeholder="Public result URL"
                    />
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm font-semibold text-ink/70 disabled:opacity-50"
                      type="button"
                      onClick={syncQuerySourceUrl}
                      title="Sync URL from query"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <SourceTypeSelect
                      value={querySourceType}
                      onChange={setQuerySourceType}
                    />
                    <input
                      className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                      value={querySourcePlatform}
                      onChange={(event) => setQuerySourcePlatform(event.target.value)}
                      placeholder="Platform"
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
                      type="button"
                      disabled={busy || !canMutate}
                      onClick={saveSearchQuery}
                    >
                      <PlusCircle className="h-4 w-4" />
                      Save query
                    </button>
                    <a
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-signal/25 px-4 py-2 text-sm font-semibold text-signal"
                      href={querySourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open search
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-ink/10 bg-white p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <UploadCloud className="h-4 w-4 text-signal" />
                  Import public results
                </div>
                <div className="space-y-2">
                  <select
                    className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                    value={selectedAtlasEntryId}
                    onChange={(event) => chooseAtlasSource(event.target.value)}
                  >
                    <option value="">No atlas source linked</option>
                    {sourceAtlasEntries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <select
                      className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                      value={selectedQueryId}
                      onChange={(event) => chooseSavedQuery(event.target.value)}
                    >
                      <option value="">No saved query linked</option>
                      {savedQueries.map((query) => (
                        <option key={query.id} value={query.id}>
                          {query.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-clay/25 px-3 py-2 text-sm font-semibold text-clay disabled:opacity-50"
                      type="button"
                      disabled={busy || !canMutate || !selectedQueryId}
                      onClick={deleteSelectedQuery}
                      title="Remove saved search"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                    value={importName}
                    onChange={(event) => setImportName(event.target.value)}
                    placeholder="Import name"
                  />
                  <input
                    className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                    value={importUrl}
                    onChange={(event) => setImportUrl(event.target.value)}
                    placeholder="Public source URL"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <SourceTypeSelect
                      value={importSourceType}
                      onChange={setImportSourceType}
                    />
                    <input
                      className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                      value={importSourcePlatform}
                      onChange={(event) => setImportSourcePlatform(event.target.value)}
                      placeholder="Platform"
                    />
                  </div>
                  <textarea
                    className="min-h-28 w-full resize-y rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                    value={pastedResults}
                    onChange={(event) => setPastedResults(event.target.value)}
                    placeholder="Paste public search results, snippets, or page text."
                  />
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
                    type="button"
                    disabled={busy || !canMutate}
                    onClick={importResults}
                  >
                    <UploadCloud className="h-4 w-4" />
                    Import to review
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-ink/10 bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Layers2 className="h-4 w-4 text-signal" />
                    Duplicate watch
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      className="h-8 w-20 rounded-md border border-ink/15 px-2 text-sm outline-none focus:border-signal"
                      value={expectedMalePool}
                      onChange={(event) => setExpectedMalePool(event.target.value)}
                      aria-label="Expected male pool"
                    />
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ink/15 text-ink/70 disabled:opacity-50"
                      type="button"
                      disabled={busy || !canMutate}
                      onClick={refreshExpansionFromPool}
                      title="Refresh coverage"
                    >
                      <Gauge className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {duplicateGroups.slice(0, 3).map((group) => (
                    <div
                      key={group.identityKey}
                      className="rounded-md border border-brass/20 bg-field p-2"
                    >
                      <p className="truncate text-sm font-semibold">
                        {formatDuplicateGroupLabel(group)}
                      </p>
                      <p className="mt-1 text-xs text-ink/60">
                        {group.statuses.map((status) => status.replace("_", " ")).join(" / ")}
                      </p>
                    </div>
                  ))}
                  {duplicateGroups.length === 0 ? (
                    <p className="rounded-md border border-ink/10 bg-field p-3 text-sm text-ink/60">
                      No duplicate identities detected.
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 rounded-md border border-brass/20 bg-field p-3 text-xs leading-5 text-ink/70">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-brass">
                    <ShieldAlert className="h-4 w-4" />
                    Expansion boundary
                  </div>
                  Pasted public results only. Keep private, login-only, deleted, and
                  sensitive content out of the queue.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-ink/10 bg-field p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <FileSearch className="h-4 w-4 text-signal" />
            Public source seed
          </div>
          <div className="space-y-3">
            <input
              className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Source name"
            />
            <input
              className="w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Public URL"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value as DiscoverySourceType)}
              >
                <SourceTypeOptions />
              </select>
              <input
                className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
                value={sourcePlatform}
                onChange={(event) => setSourcePlatform(event.target.value)}
                placeholder="Platform"
              />
            </div>
            <textarea
              className="min-h-32 w-full resize-y rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
              value={htmlOverride}
              onChange={(event) => setHtmlOverride(event.target.value)}
              placeholder="Paste public HTML or text from the source for this MVP run."
            />
            <div className="rounded-md border border-brass/20 bg-white p-3 text-xs leading-5 text-ink/70">
              <div className="mb-1 flex items-center gap-2 font-semibold text-brass">
                <ShieldAlert className="h-4 w-4" />
                Review boundary
              </div>
              Public pages only. No login-only content, private groups, deleted content,
              fake accounts, or automated messaging.
            </div>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-signal px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
              type="button"
              disabled={busy || !canMutate}
              onClick={runPublicDiscovery}
            >
              <Sparkles className="h-4 w-4" />
              Run discovery
            </button>
            {message ? <p className="text-sm font-medium text-signal">{message}</p> : null}
            {!canMutate ? (
              <p className="text-xs text-ink/60">
                API URL not configured; showing demo discovery data.
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {sources.length} sources / {candidates.length} candidates
            </p>
            <a
              className="inline-flex items-center gap-1 text-sm font-semibold text-signal"
              href={sources[0]?.url ?? "#"}
              target="_blank"
              rel="noreferrer"
            >
              Source context
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {candidateStatuses.map((status) => (
              <section
                key={status.id}
                className="min-h-36 rounded-md border border-ink/10 bg-field p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{status.label}</h3>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold">
                    {grouped[status.id].length}
                  </span>
                </div>
                <div className="space-y-2">
                  {grouped[status.id].slice(0, 3).map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      disabled={busy || !canMutate}
                      onApprove={() => review(candidate.id, "approved")}
                      onReject={() => review(candidate.id, "rejected")}
                      onRemove={() => review(candidate.id, "removed")}
                      onPromote={() => promote(candidate.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DiscoveryMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-field px-3 py-2">
      <p className="text-xs text-ink/55">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-white px-2 py-1">
      <p className="text-[11px] text-ink/50">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function SourceAtlasCategoryOptions() {
  return (
    <>
      <option value="institutional">Institutional</option>
      <option value="athletics">Athletics</option>
      <option value="student_org">Student org</option>
      <option value="campus_event">Campus event</option>
      <option value="local_news">Local news</option>
      <option value="high_school">High school</option>
      <option value="opt_in">Opt-in</option>
      <option value="member_referral">Member referral</option>
    </>
  );
}

function SourceTypeSelect({
  value,
  onChange,
}: {
  value: DiscoverySourceType;
  onChange: (value: DiscoverySourceType) => void;
}) {
  return (
    <select
      className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
      value={value}
      onChange={(event) => onChange(event.target.value as DiscoverySourceType)}
    >
      <SourceTypeOptions />
    </select>
  );
}

function SourceTypeOptions() {
  return (
    <>
      <option value="orientation_page">Orientation page</option>
      <option value="athletics_roster">Athletics roster</option>
      <option value="hashtag_page">Hashtag page</option>
      <option value="public_web_page">Public web page</option>
      <option value="public_social_profile">Public social profile</option>
    </>
  );
}

function CandidateCard({
  candidate,
  disabled,
  onApprove,
  onReject,
  onRemove,
  onPromote,
}: {
  candidate: CandidateLead;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRemove: () => void;
  onPromote: () => void;
}) {
  return (
    <article className="rounded-md bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {candidate.displayName || candidate.handle || "Unnamed candidate"}
          </p>
          <p className="truncate text-xs text-ink/55">
            {candidate.handle || candidate.sourcePlatform}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-signal/10 px-2 py-1 text-xs font-bold text-signal">
          {candidate.confidenceScore}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink/70">
        {candidate.evidence}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {candidate.status === "needs_review" ? (
          <>
            <button
              className="inline-flex items-center gap-1 rounded-md border border-moss/25 px-2 py-1 text-xs font-semibold text-moss disabled:opacity-50"
              type="button"
              disabled={disabled}
              onClick={onApprove}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
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
          </>
        ) : null}
        {candidate.status === "approved" ? (
          <button
            className="inline-flex items-center gap-1 rounded-md border border-signal/25 px-2 py-1 text-xs font-semibold text-signal disabled:opacity-50"
            type="button"
            disabled={disabled}
            onClick={onPromote}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Promote
          </button>
        ) : null}
        {candidate.status !== "removed" && candidate.status !== "rejected" ? (
          <button
            className="inline-flex items-center gap-1 rounded-md border border-clay/25 px-2 py-1 text-xs font-semibold text-clay disabled:opacity-50"
            type="button"
            disabled={disabled}
            onClick={onRemove}
          >
            <XCircle className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>
    </article>
  );
}
