from __future__ import annotations

import csv
from io import StringIO
from datetime import UTC, datetime
from urllib.parse import urlencode

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.discovery import extract_candidates_from_html, fetch_public_page, validate_public_url
from app.models import (
    CandidateLead,
    CandidateStatus,
    CollectionMethod,
    DiscoveryRun,
    DiscoveryRunStatus,
    DiscoverySource,
    DiscoverySourceType,
    FollowUpTask,
    ImportMethod,
    IntakeLead,
    IntakeLeadStatus,
    IntakeSourceType,
    Prospect,
    ProspectNote,
    RecruitmentStatus,
    SavedSearchQuery,
    SourceAtlasCategory,
    SourceAtlasEntry,
    SourceAtlasImportLink,
    SourceAtlasStatus,
    SourceImportBatch,
    SuppressionEntry,
)
from app.schemas import (
    CandidateDuplicateGroup,
    CandidateLeadRead,
    CandidateReviewUpdate,
    DiscoveryCoverageRead,
    DiscoveryCoverageRequest,
    DiscoveryRunCreate,
    DiscoverySourceCreate,
    FollowUpCreate,
    IntakeCsvImportCreate,
    IntakeCsvImportResult,
    IntakeDuplicateGroup,
    IntakeLeadCreate,
    IntakeLeadRead,
    IntakeLeadReviewUpdate,
    IntakeMetricsRead,
    NoteCreate,
    ProspectCreate,
    PublicResultsImportCreate,
    RemovalCreate,
    SavedSearchQueryCreate,
    SourceAtlasCreate,
    SourceAtlasRead,
    SourceAtlasReportItem,
    SourceSetupResult,
    SuppressionCreate,
)


def google_search_url(query: str) -> str:
    return f"https://www.google.com/search?{urlencode({'q': query})}"


WASHBURN_SOURCE_ATLAS_SEEDS = [
    SourceAtlasCreate(
        name="Washburn admitted student portal",
        url="https://www.washburn.edu/admissions/admitted/index.html",
        category=SourceAtlasCategory.institutional,
        source_type=DiscoverySourceType.orientation_page,
        source_platform="Washburn",
        public_access_confirmed=True,
        priority=5,
        review_cadence_days=14,
        notes="Official admitted-student hub. Use only public page text and linked public pages.",
    ),
    SourceAtlasCreate(
        name="Washburn new student orientation",
        url="https://www.washburn.edu/admissions/admitted/orientation.html",
        category=SourceAtlasCategory.institutional,
        source_type=DiscoverySourceType.orientation_page,
        source_platform="Washburn",
        public_access_confirmed=True,
        priority=5,
        review_cadence_days=7,
        notes="Official public orientation page for new undergraduates.",
    ),
    SourceAtlasCreate(
        name="Washburn student organizations",
        url="https://www.washburn.edu/student-life/student-involvement/student-organizations/index.html",
        category=SourceAtlasCategory.student_org,
        source_type=DiscoverySourceType.public_web_page,
        source_platform="Washburn",
        public_access_confirmed=True,
        priority=3,
        review_cadence_days=30,
        notes="Official public hub for student organizations and involvement.",
    ),
    SourceAtlasCreate(
        name="Washburn Weeks of Welcome schedule",
        url="https://www.washburn.edu/admissions/admitted/Files/Weeks-of-Welcome-schedule.pdf",
        category=SourceAtlasCategory.campus_event,
        source_type=DiscoverySourceType.public_web_page,
        source_platform="Washburn",
        public_access_confirmed=True,
        priority=4,
        review_cadence_days=14,
        notes="Official public welcome-week schedule. Paste public text snippets for review.",
    ),
    SourceAtlasCreate(
        name="Washburn football roster",
        url="https://wusports.com/sports/football/roster",
        category=SourceAtlasCategory.athletics,
        source_type=DiscoverySourceType.athletics_roster,
        source_platform="WUsports",
        public_access_confirmed=True,
        priority=5,
        review_cadence_days=14,
        notes="Official public athletics roster.",
    ),
    SourceAtlasCreate(
        name="Washburn baseball roster",
        url="https://wusports.com/sports/baseball/roster",
        category=SourceAtlasCategory.athletics,
        source_type=DiscoverySourceType.athletics_roster,
        source_platform="WUsports",
        public_access_confirmed=True,
        priority=4,
        review_cadence_days=14,
        notes="Official public athletics roster.",
    ),
    SourceAtlasCreate(
        name="Washburn men's basketball roster",
        url="https://wusports.com/sports/mens-basketball/roster",
        category=SourceAtlasCategory.athletics,
        source_type=DiscoverySourceType.athletics_roster,
        source_platform="WUsports",
        public_access_confirmed=True,
        priority=4,
        review_cadence_days=14,
        notes="Official public athletics roster.",
    ),
    SourceAtlasCreate(
        name="Washburn men's cross country roster",
        url="https://wusports.com/sports/mens-cross-country/roster",
        category=SourceAtlasCategory.athletics,
        source_type=DiscoverySourceType.athletics_roster,
        source_platform="WUsports",
        public_access_confirmed=True,
        priority=3,
        review_cadence_days=21,
        notes="Official public athletics roster.",
    ),
    SourceAtlasCreate(
        name="Washburn men's golf roster",
        url="https://wusports.com/sports/mens-golf/roster",
        category=SourceAtlasCategory.athletics,
        source_type=DiscoverySourceType.athletics_roster,
        source_platform="WUsports",
        public_access_confirmed=True,
        priority=3,
        review_cadence_days=21,
        notes="Official public athletics roster.",
    ),
    SourceAtlasCreate(
        name="Washburn men's tennis roster",
        url="https://wusports.com/sports/mens-tennis/roster",
        category=SourceAtlasCategory.athletics,
        source_type=DiscoverySourceType.athletics_roster,
        source_platform="WUsports",
        public_access_confirmed=True,
        priority=3,
        review_cadence_days=21,
        notes="Official public athletics roster.",
    ),
    SourceAtlasCreate(
        name="Washburn men's track and field roster",
        url="https://wusports.com/sports/mens-track-and-field/roster",
        category=SourceAtlasCategory.athletics,
        source_type=DiscoverySourceType.athletics_roster,
        source_platform="WUsports",
        public_access_confirmed=True,
        priority=3,
        review_cadence_days=21,
        notes="Official public athletics roster.",
    ),
]


WASHBURN_SAVED_SEARCH_SEEDS = [
    (
        "Washburn incoming class",
        '"Washburn University" "incoming freshman"',
        "Public search for explicit incoming-freshman language.",
    ),
    (
        "Washburn first-year orientation",
        '"Washburn University" "first-year" "orientation"',
        "Public search around first-year orientation language.",
    ),
    (
        "Washburn class year",
        '"Washburn University" "class of 2030"',
        "Public search for self-announced class-year mentions.",
    ),
    (
        "Committed to Washburn",
        '"committed to Washburn" senior',
        "Public search for self-announced Washburn commitments.",
    ),
    (
        "Signed with Washburn",
        '"signed with Washburn" senior',
        "Public search for public signing announcements.",
    ),
    (
        "Washburn orientation freshman",
        '"Washburn University" "orientation" "freshman"',
        "Public search for orientation and freshman context.",
    ),
    (
        "Washburn move-in freshman",
        '"Washburn University" "move-in" "freshman"',
        "Public search for move-in context.",
    ),
    (
        "WUsports freshman rosters",
        'site:wusports.com/sports Washburn "Fr." "Roster"',
        "Public search focused on official WUsports roster pages.",
    ),
    (
        "Washburn Review freshman",
        'site:washburnreview.org Washburn freshman',
        "Public search focused on public student-newspaper mentions.",
    ),
]


def normalize_identity(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized.startswith("@"):
        normalized = normalized[1:]
    return normalized or None


def normalize_platform(value: str) -> str:
    return value.strip().lower()


def ensure_public_collection(payload: ProspectCreate) -> None:
    if not payload.public_information_confirmed:
        raise ValueError("Prospect collection must be confirmed as public information.")


def ensure_not_suppressed(db: Session, platform: str, handle: str | None) -> None:
    normalized_handle = normalize_identity(handle)
    if normalized_handle is None:
        return

    entry = db.scalar(
        select(SuppressionEntry).where(
            SuppressionEntry.normalized_platform == normalize_platform(platform),
            SuppressionEntry.normalized_handle == normalized_handle,
        )
    )
    if entry is not None:
        raise ValueError("Prospect matches the suppression list.")


def create_prospect(db: Session, payload: ProspectCreate) -> Prospect:
    ensure_public_collection(payload)
    ensure_not_suppressed(db, payload.source_platform, payload.primary_handle)

    prospect = Prospect(
        first_name=payload.first_name,
        last_name=payload.last_name,
        preferred_name=payload.preferred_name,
        hometown=payload.hometown,
        high_school=payload.high_school,
        major=payload.major,
        rush_score=payload.rush_score,
        status=payload.status,
        interests=payload.interests,
        notes=payload.notes,
        source_platform=payload.source_platform,
        primary_handle=payload.primary_handle,
        normalized_handle=normalize_identity(payload.primary_handle),
        source_url=payload.source_url,
        collection_method=payload.collection_method,
        public_information_confirmed=payload.public_information_confirmed,
    )
    db.add(prospect)
    db.commit()
    db.refresh(prospect)
    return prospect


def list_prospects(db: Session) -> list[Prospect]:
    return list(db.scalars(select(Prospect).order_by(Prospect.created_at, Prospect.first_name)))


def get_prospect(db: Session, prospect_id: str) -> Prospect:
    prospect = db.get(Prospect, prospect_id)
    if prospect is None:
        raise LookupError("Prospect not found.")
    return prospect


def update_prospect_status(
    db: Session,
    prospect_id: str,
    status: RecruitmentStatus,
) -> Prospect:
    prospect = get_prospect(db, prospect_id)
    prospect.status = status
    db.commit()
    db.refresh(prospect)
    return prospect


def remove_prospect(db: Session, prospect_id: str, payload: RemovalCreate) -> Prospect:
    prospect = get_prospect(db, prospect_id)
    removal_note = f"Removed as not applicable: {payload.reason}"
    prospect.status = RecruitmentStatus.not_applicable
    prospect.notes = f"{prospect.notes}\n\n{removal_note}" if prospect.notes else removal_note
    db.commit()
    db.refresh(prospect)
    return prospect


def add_note(db: Session, prospect_id: str, payload: NoteCreate) -> ProspectNote:
    get_prospect(db, prospect_id)
    note = ProspectNote(prospect_id=prospect_id, author=payload.author, body=payload.body)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def add_follow_up(db: Session, prospect_id: str, payload: FollowUpCreate) -> FollowUpTask:
    get_prospect(db, prospect_id)
    follow_up = FollowUpTask(
        prospect_id=prospect_id,
        owner=payload.owner,
        due_date=payload.due_date,
        reason=payload.reason,
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)
    return follow_up


def suppress_identity(db: Session, payload: SuppressionCreate) -> SuppressionEntry:
    entry = SuppressionEntry(
        platform=payload.platform,
        normalized_platform=normalize_platform(payload.platform),
        handle=payload.handle,
        normalized_handle=normalize_identity(payload.handle) or "",
        reason=payload.reason,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def normalize_email(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None


def normalize_display_name(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(value.strip().lower().split())
    return normalized or None


def intake_source_label(source_type: IntakeSourceType) -> str:
    return source_type.value.replace("_", " ").capitalize()


def create_intake_lead(db: Session, payload: IntakeLeadCreate) -> IntakeLead:
    lead = IntakeLead(
        first_name=payload.first_name,
        last_name=payload.last_name,
        preferred_name=payload.preferred_name,
        primary_handle=payload.primary_handle,
        normalized_handle=normalize_identity(payload.primary_handle),
        phone=payload.phone,
        email=payload.email,
        normalized_email=normalize_email(payload.email),
        hometown=payload.hometown,
        high_school=payload.high_school,
        interests=payload.interests,
        source_type=payload.source_type,
        source_label=payload.source_label,
        referred_by=payload.referred_by,
        event_name=payload.event_name,
        evidence=payload.evidence,
        notes=payload.notes,
        status=IntakeLeadStatus.needs_review,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def list_intake_leads(
    db: Session,
    status: IntakeLeadStatus | None = None,
) -> list[IntakeLead]:
    statement = select(IntakeLead).order_by(
        IntakeLead.created_at.desc(),
        IntakeLead.first_name,
    )
    if status is not None:
        statement = statement.where(IntakeLead.status == status)
    return list(db.scalars(statement))


def get_intake_lead(db: Session, lead_id: str) -> IntakeLead:
    lead = db.get(IntakeLead, lead_id)
    if lead is None:
        raise LookupError("Intake lead not found.")
    return lead


def update_intake_lead_status(
    db: Session,
    lead_id: str,
    payload: IntakeLeadReviewUpdate,
) -> IntakeLead:
    lead = get_intake_lead(db, lead_id)
    if payload.status == IntakeLeadStatus.promoted:
        raise ValueError("Use the promote endpoint to promote an intake lead.")
    if payload.status in {IntakeLeadStatus.rejected, IntakeLeadStatus.removed} and not payload.rejection_reason:
        raise ValueError("Rejected or removed intake leads requires a reason.")
    lead.status = payload.status
    lead.rejection_reason = payload.rejection_reason
    db.commit()
    db.refresh(lead)
    return lead


def intake_identity_key(lead: IntakeLead) -> str | None:
    if lead.normalized_handle:
        return f"handle:{lead.normalized_handle}"
    if lead.normalized_email:
        return f"email:{lead.normalized_email}"
    display_name = normalize_display_name(f"{lead.first_name} {lead.last_name or ''}")
    if display_name:
        return f"name:{display_name}"
    return None


def intake_identity_label(lead: IntakeLead) -> str:
    return lead.primary_handle or lead.email or f"{lead.first_name} {lead.last_name or ''}".strip()


def list_intake_duplicate_groups(db: Session) -> list[IntakeDuplicateGroup]:
    leads = list(
        db.scalars(
            select(IntakeLead).order_by(
                IntakeLead.created_at.asc(),
                IntakeLead.first_name,
            )
        )
    )
    grouped: dict[str, list[IntakeLead]] = {}
    for lead in leads:
        key = intake_identity_key(lead)
        if key is None:
            continue
        grouped.setdefault(key, []).append(lead)

    duplicate_groups: list[IntakeDuplicateGroup] = []
    for key, members in grouped.items():
        if len(members) < 2:
            continue
        statuses: list[IntakeLeadStatus] = []
        for member in members:
            if member.status not in statuses:
                statuses.append(member.status)
        duplicate_groups.append(
            IntakeDuplicateGroup(
                identity_key=key,
                label=intake_identity_label(members[0]),
                count=len(members),
                statuses=statuses,
                leads=[IntakeLeadRead.model_validate(member) for member in members],
            )
        )

    return sorted(duplicate_groups, key=lambda group: (-group.count, group.identity_key))


def get_intake_metrics(db: Session) -> IntakeMetricsRead:
    leads = list(db.scalars(select(IntakeLead)))
    source_mix = {source_type: 0 for source_type in IntakeSourceType}
    for lead in leads:
        source_mix[lead.source_type] += 1
    return IntakeMetricsRead(
        total_leads=len(leads),
        needs_review=sum(1 for lead in leads if lead.status == IntakeLeadStatus.needs_review),
        promoted=sum(1 for lead in leads if lead.status == IntakeLeadStatus.promoted),
        removed=sum(1 for lead in leads if lead.status == IntakeLeadStatus.removed),
        duplicate_groups=len(list_intake_duplicate_groups(db)),
        source_mix=source_mix,
    )


def split_import_name(row: dict[str, str]) -> tuple[str, str | None]:
    first_name = (row.get("first_name") or "").strip()
    last_name = (row.get("last_name") or "").strip()
    if first_name:
        return first_name, last_name or None

    name = (row.get("name") or "").strip()
    parts = name.split()
    if not parts:
        return "", None
    return parts[0], " ".join(parts[1:]) or None


def split_interests(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def import_intake_csv(db: Session, payload: IntakeCsvImportCreate) -> IntakeCsvImportResult:
    reader = csv.DictReader(StringIO(payload.csv_text.strip()))
    created: list[IntakeLead] = []
    errors: list[str] = []
    skipped_count = 0
    for index, row in enumerate(reader, start=2):
        first_name, last_name = split_import_name(row)
        if not first_name:
            skipped_count += 1
            errors.append(f"Row {index}: missing name or first_name.")
            continue
        lead = create_intake_lead(
            db,
            IntakeLeadCreate(
                first_name=first_name,
                last_name=last_name,
                preferred_name=(row.get("preferred_name") or "").strip() or first_name,
                primary_handle=(row.get("handle") or row.get("primary_handle") or "").strip() or None,
                phone=(row.get("phone") or "").strip() or None,
                email=(row.get("email") or "").strip() or None,
                hometown=(row.get("hometown") or "").strip() or None,
                high_school=(row.get("high_school") or "").strip() or None,
                interests=split_interests(row.get("interests")),
                source_type=IntakeSourceType.csv_import,
                source_label=payload.source_label,
                referred_by=(row.get("referred_by") or "").strip() or None,
                event_name=(row.get("event_name") or "").strip() or None,
                evidence=f"Imported from CSV source: {payload.source_label}.",
                notes=(row.get("notes") or "").strip() or None,
            ),
        )
        created.append(lead)

    return IntakeCsvImportResult(
        created_count=len(created),
        skipped_count=skipped_count,
        errors=errors,
        created_leads=[IntakeLeadRead.model_validate(lead) for lead in created],
    )


def promote_intake_lead_to_prospect(db: Session, lead_id: str) -> Prospect:
    lead = get_intake_lead(db, lead_id)
    if lead.status not in {IntakeLeadStatus.needs_review, IntakeLeadStatus.rejected}:
        raise ValueError("Only reviewable intake leads can be promoted.")
    ensure_not_suppressed(db, intake_source_label(lead.source_type), lead.primary_handle)
    source_name = intake_source_label(lead.source_type)
    note_parts = [
        f"Promoted from intake lead.",
        f"Source: {lead.source_label}.",
        f"Evidence: {lead.evidence}",
    ]
    if lead.referred_by:
        note_parts.append(f"Referred by: {lead.referred_by}.")
    if lead.event_name:
        note_parts.append(f"Event: {lead.event_name}.")
    if lead.notes:
        note_parts.append(f"Notes: {lead.notes}")

    prospect = create_prospect(
        db,
        ProspectCreate(
            first_name=lead.first_name,
            last_name=lead.last_name,
            preferred_name=lead.preferred_name or lead.first_name,
            hometown=lead.hometown,
            high_school=lead.high_school,
            source_platform=source_name,
            primary_handle=lead.primary_handle,
            source_url=None,
            collection_method=CollectionMethod.manual,
            public_information_confirmed=True,
            interests=lead.interests,
            notes=" ".join(note_parts),
            rush_score=60 + min(len(lead.interests) * 5, 20),
            status=RecruitmentStatus.identified,
        ),
    )
    lead.status = IntakeLeadStatus.promoted
    lead.promoted_prospect_id = prospect.id
    db.commit()
    db.refresh(lead)
    db.refresh(prospect)
    return prospect


def create_discovery_source(
    db: Session,
    payload: DiscoverySourceCreate,
) -> DiscoverySource:
    if not payload.public_access_confirmed:
        raise ValueError("Discovery source requires public access confirmation.")
    validate_public_url(payload.url)
    source = DiscoverySource(
        name=payload.name,
        url=payload.url,
        source_type=payload.source_type,
        source_platform=payload.source_platform,
        public_access_confirmed=payload.public_access_confirmed,
        robots_check_required=payload.robots_check_required,
        notes=payload.notes,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def create_saved_search_query(
    db: Session,
    payload: SavedSearchQueryCreate,
) -> SavedSearchQuery:
    if not payload.public_access_confirmed:
        raise ValueError("Saved search query requires public access confirmation.")
    validate_public_url(payload.source_url)
    query = SavedSearchQuery(
        label=payload.label,
        query=payload.query,
        source_type=payload.source_type,
        source_platform=payload.source_platform,
        source_url=payload.source_url,
        public_access_confirmed=payload.public_access_confirmed,
        notes=payload.notes,
        active=True,
    )
    db.add(query)
    db.commit()
    db.refresh(query)
    return query


def list_saved_search_queries(db: Session) -> list[SavedSearchQuery]:
    return list(
        db.scalars(
            select(SavedSearchQuery).where(SavedSearchQuery.active.is_(True)).order_by(
                SavedSearchQuery.created_at.desc(),
                SavedSearchQuery.label,
            )
        )
    )


def get_saved_search_query(db: Session, query_id: str) -> SavedSearchQuery:
    query = db.get(SavedSearchQuery, query_id)
    if query is None:
        raise LookupError("Saved search query not found.")
    return query


def delete_saved_search_query(db: Session, query_id: str) -> SavedSearchQuery:
    query = get_saved_search_query(db, query_id)
    query.active = False
    db.commit()
    db.refresh(query)
    return query


def create_source_atlas_entry(
    db: Session,
    payload: SourceAtlasCreate,
) -> SourceAtlasEntry:
    if not payload.public_access_confirmed:
        raise ValueError("Source atlas entry requires public access confirmation.")
    validate_public_url(payload.url)
    entry = SourceAtlasEntry(
        name=payload.name,
        url=payload.url,
        category=payload.category,
        source_type=payload.source_type,
        source_platform=payload.source_platform,
        public_access_confirmed=payload.public_access_confirmed,
        priority=payload.priority,
        review_cadence_days=payload.review_cadence_days,
        notes=payload.notes,
        status=SourceAtlasStatus.active,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def list_source_atlas_entries(db: Session) -> list[SourceAtlasEntry]:
    return list(
        db.scalars(
            select(SourceAtlasEntry)
            .where(SourceAtlasEntry.status == SourceAtlasStatus.active)
            .order_by(SourceAtlasEntry.priority.desc(), SourceAtlasEntry.name)
        )
    )


def get_source_atlas_entry(db: Session, entry_id: str) -> SourceAtlasEntry:
    entry = db.get(SourceAtlasEntry, entry_id)
    if entry is None:
        raise LookupError("Source atlas entry not found.")
    return entry


def archive_source_atlas_entry(db: Session, entry_id: str) -> SourceAtlasEntry:
    entry = get_source_atlas_entry(db, entry_id)
    entry.status = SourceAtlasStatus.archived
    db.commit()
    db.refresh(entry)
    return entry


def source_atlas_url_exists(db: Session, url: str) -> bool:
    return (
        db.scalar(select(SourceAtlasEntry.id).where(SourceAtlasEntry.url == url))
        is not None
    )


def saved_search_query_exists(db: Session, query: str) -> bool:
    return (
        db.scalar(select(SavedSearchQuery.id).where(SavedSearchQuery.query == query))
        is not None
    )


def seed_washburn_source_pack(db: Session) -> SourceSetupResult:
    created_source_names: list[str] = []
    created_search_labels: list[str] = []
    atlas_sources_skipped = 0
    saved_searches_skipped = 0

    for seed in WASHBURN_SOURCE_ATLAS_SEEDS:
        if source_atlas_url_exists(db, seed.url):
            atlas_sources_skipped += 1
            continue
        create_source_atlas_entry(db, seed)
        created_source_names.append(seed.name)

    for label, query, notes in WASHBURN_SAVED_SEARCH_SEEDS:
        if saved_search_query_exists(db, query):
            saved_searches_skipped += 1
            continue
        create_saved_search_query(
            db,
            SavedSearchQueryCreate(
                label=label,
                query=query,
                source_type=DiscoverySourceType.public_web_page,
                source_platform="Google Search",
                source_url=google_search_url(query),
                public_access_confirmed=True,
                notes=notes,
            ),
        )
        created_search_labels.append(label)

    return SourceSetupResult(
        atlas_sources_created=len(created_source_names),
        atlas_sources_skipped=atlas_sources_skipped,
        saved_searches_created=len(created_search_labels),
        saved_searches_skipped=saved_searches_skipped,
        created_source_names=created_source_names,
        created_search_labels=created_search_labels,
    )


def list_discovery_sources(db: Session) -> list[DiscoverySource]:
    return list(
        db.scalars(select(DiscoverySource).order_by(DiscoverySource.created_at, DiscoverySource.name))
    )


def get_discovery_source(db: Session, source_id: str) -> DiscoverySource:
    source = db.get(DiscoverySource, source_id)
    if source is None:
        raise LookupError("Discovery source not found.")
    return source


def list_discovery_runs(db: Session) -> list[DiscoveryRun]:
    return list(db.scalars(select(DiscoveryRun).order_by(DiscoveryRun.started_at.desc())))


def run_discovery(db: Session, payload: DiscoveryRunCreate) -> DiscoveryRun:
    source = get_discovery_source(db, payload.source_id)
    run = DiscoveryRun(
        source_id=source.id,
        status=DiscoveryRunStatus.failed,
        robots_allowed=False,
        http_status=None,
        candidates_found=0,
    )
    db.add(run)
    db.flush()

    if payload.html_override is not None:
        fetch_result_text = payload.html_override
        run.robots_allowed = True
        run.http_status = 200
        run.error = None
    else:
        fetch_result = fetch_public_page(source.url, source.robots_check_required)
        run.robots_allowed = fetch_result.robots_allowed
        run.http_status = fetch_result.http_status
        run.error = fetch_result.error
        fetch_result_text = fetch_result.text
        if not fetch_result.robots_allowed:
            run.status = DiscoveryRunStatus.blocked
            run.completed_at = datetime.now(UTC)
            db.commit()
            db.refresh(run)
            return run
        if fetch_result.error:
            run.status = DiscoveryRunStatus.failed
            run.completed_at = datetime.now(UTC)
            db.commit()
            db.refresh(run)
            return run

    extracted = extract_candidates_from_html(fetch_result_text)
    for candidate in extracted:
        lead = CandidateLead(
            source_id=source.id,
            run_id=run.id,
            display_name=candidate.display_name,
            handle=candidate.handle,
            normalized_handle=normalize_identity(candidate.handle),
            source_platform=source.source_platform,
            source_url=source.url,
            evidence=candidate.evidence,
            rationale=candidate.rationale,
            confidence_score=candidate.confidence_score,
            status=CandidateStatus.needs_review,
        )
        db.add(lead)

    run.status = DiscoveryRunStatus.completed
    run.candidates_found = len(extracted)
    run.completed_at = datetime.now(UTC)
    db.commit()
    db.refresh(run)
    return run


def import_public_results(
    db: Session,
    payload: PublicResultsImportCreate,
) -> SourceImportBatch:
    if not payload.public_access_confirmed:
        raise ValueError("Source import requires public access confirmation.")
    if payload.saved_search_query_id is not None:
        get_saved_search_query(db, payload.saved_search_query_id)
    atlas_entry: SourceAtlasEntry | None = None
    if payload.source_atlas_entry_id is not None:
        atlas_entry = get_source_atlas_entry(db, payload.source_atlas_entry_id)
        if atlas_entry.status != SourceAtlasStatus.active:
            raise ValueError("Source atlas entry is archived.")

    source = create_discovery_source(
        db,
        DiscoverySourceCreate(
            name=payload.name,
            url=payload.url,
            source_type=payload.source_type,
            source_platform=payload.source_platform,
            public_access_confirmed=payload.public_access_confirmed,
            robots_check_required=False,
            notes=payload.notes,
        ),
    )
    run = run_discovery(
        db,
        DiscoveryRunCreate(source_id=source.id, html_override=payload.pasted_results),
    )
    excerpt = payload.pasted_results.strip()[:1_000]
    batch = SourceImportBatch(
        saved_search_query_id=payload.saved_search_query_id,
        source_id=source.id,
        run_id=run.id,
        import_method=ImportMethod.pasted_public_results,
        public_access_confirmed=payload.public_access_confirmed,
        pasted_results_excerpt=excerpt,
        candidates_created=run.candidates_found,
        notes=payload.notes,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    if atlas_entry is not None:
        link = SourceAtlasImportLink(
            source_atlas_entry_id=atlas_entry.id,
            source_id=source.id,
            run_id=run.id,
            source_import_batch_id=batch.id,
        )
        db.add(link)
        db.commit()
        db.refresh(batch)
    return batch


def get_source_atlas_report(db: Session) -> list[SourceAtlasReportItem]:
    entries = list(
        db.scalars(
            select(SourceAtlasEntry).order_by(
                SourceAtlasEntry.priority.desc(),
                SourceAtlasEntry.name,
            )
        )
    )
    usable_statuses = {
        CandidateStatus.needs_review,
        CandidateStatus.approved,
        CandidateStatus.promoted,
    }
    report: list[SourceAtlasReportItem] = []
    for entry in entries:
        links = list(
            db.scalars(
                select(SourceAtlasImportLink).where(
                    SourceAtlasImportLink.source_atlas_entry_id == entry.id
                )
            )
        )
        source_ids = {link.source_id for link in links}
        if source_ids:
            candidates = list(
                db.scalars(select(CandidateLead).where(CandidateLead.source_id.in_(source_ids)))
            )
        else:
            candidates = []
        last_imported_at = max((link.created_at for link in links), default=None)
        report.append(
            SourceAtlasReportItem(
                source=SourceAtlasRead.model_validate(entry),
                import_count=len({link.run_id for link in links}),
                total_candidates=len(candidates),
                usable_leads=sum(
                    1 for candidate in candidates if candidate.status in usable_statuses
                ),
                last_imported_at=last_imported_at,
            )
        )
    return report


def normalize_display_name(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = " ".join(value.strip().lower().split())
    return normalized or None


def candidate_identity_key(candidate: CandidateLead) -> str | None:
    if candidate.normalized_handle:
        return f"handle:{candidate.normalized_handle}"
    normalized_name = normalize_display_name(candidate.display_name)
    if normalized_name:
        return f"name:{normalized_name}"
    return None


def candidate_identity_label(candidate: CandidateLead) -> str:
    return candidate.handle or candidate.display_name or "Unnamed candidate"


def list_candidate_duplicate_groups(db: Session) -> list[CandidateDuplicateGroup]:
    candidates = list(
        db.scalars(
            select(CandidateLead).order_by(
                CandidateLead.created_at.asc(),
                CandidateLead.confidence_score.desc(),
            )
        )
    )
    grouped: dict[str, list[CandidateLead]] = {}
    for candidate in candidates:
        key = candidate_identity_key(candidate)
        if key is None:
            continue
        grouped.setdefault(key, []).append(candidate)

    duplicate_groups: list[CandidateDuplicateGroup] = []
    for key, members in grouped.items():
        if len(members) < 2:
            continue
        statuses: list[CandidateStatus] = []
        for member in members:
            if member.status not in statuses:
                statuses.append(member.status)
        duplicate_groups.append(
            CandidateDuplicateGroup(
                identity_key=key,
                label=candidate_identity_label(members[0]),
                count=len(members),
                statuses=statuses,
                candidates=[
                    CandidateLeadRead.model_validate(member) for member in members
                ],
            )
        )

    return sorted(
        duplicate_groups,
        key=lambda group: (-group.count, group.identity_key),
    )


def get_discovery_coverage(
    db: Session,
    payload: DiscoveryCoverageRequest,
) -> DiscoveryCoverageRead:
    candidates = list(db.scalars(select(CandidateLead)))
    all_keys = {
        candidate_identity_key(candidate) or f"id:{candidate.id}"
        for candidate in candidates
    }
    usable_statuses = {
        CandidateStatus.needs_review,
        CandidateStatus.approved,
        CandidateStatus.promoted,
    }
    usable_keys = {
        candidate_identity_key(candidate) or f"id:{candidate.id}"
        for candidate in candidates
        if candidate.status in usable_statuses
    }
    usable_leads = len(usable_keys)
    coverage_percent = round((usable_leads / payload.expected_male_pool) * 100, 2)
    return DiscoveryCoverageRead(
        total_candidates=len(candidates),
        unique_candidates=len(all_keys),
        usable_leads=usable_leads,
        expected_male_pool=payload.expected_male_pool,
        coverage_percent=coverage_percent,
    )


def list_candidate_leads(
    db: Session,
    status: CandidateStatus | None = None,
) -> list[CandidateLead]:
    statement = select(CandidateLead).order_by(
        CandidateLead.created_at.desc(),
        CandidateLead.confidence_score.desc(),
    )
    if status is not None:
        statement = statement.where(CandidateLead.status == status)
    return list(db.scalars(statement))


def get_candidate_lead(db: Session, candidate_id: str) -> CandidateLead:
    candidate = db.get(CandidateLead, candidate_id)
    if candidate is None:
        raise LookupError("Candidate lead not found.")
    return candidate


def update_candidate_status(
    db: Session,
    candidate_id: str,
    payload: CandidateReviewUpdate,
) -> CandidateLead:
    candidate = get_candidate_lead(db, candidate_id)
    if payload.status == CandidateStatus.promoted:
        raise ValueError("Use the promote endpoint to promote a candidate.")
    if payload.status in {CandidateStatus.rejected, CandidateStatus.removed} and not payload.rejection_reason:
        raise ValueError("Removed or rejected candidates require a review reason.")
    candidate.status = payload.status
    candidate.rejection_reason = payload.rejection_reason
    db.commit()
    db.refresh(candidate)
    return candidate


def split_display_name(display_name: str | None, handle: str | None) -> tuple[str, str | None]:
    if display_name:
        parts = display_name.split()
        first_name = parts[0]
        last_name = " ".join(parts[1:]) if len(parts) > 1 else None
        return first_name, last_name
    fallback = (normalize_identity(handle) or "candidate").replace(".", " ").replace("_", " ")
    return fallback.title(), None


def promote_candidate_to_prospect(db: Session, candidate_id: str) -> Prospect:
    candidate = get_candidate_lead(db, candidate_id)
    if candidate.status not in {CandidateStatus.approved, CandidateStatus.needs_review}:
        raise ValueError("Only reviewed or reviewable candidates can be promoted.")
    ensure_not_suppressed(db, candidate.source_platform, candidate.handle)

    first_name, last_name = split_display_name(candidate.display_name, candidate.handle)
    prospect = create_prospect(
        db,
        ProspectCreate(
            first_name=first_name,
            last_name=last_name,
            preferred_name=first_name,
            source_platform=candidate.source_platform,
            primary_handle=candidate.handle,
            source_url=candidate.source_url,
            collection_method=CollectionMethod.assisted,
            public_information_confirmed=True,
            interests=[],
            notes=f"Promoted from discovery candidate. Evidence: {candidate.evidence}",
            rush_score=candidate.confidence_score,
        ),
    )
    candidate.status = CandidateStatus.promoted
    candidate.promoted_prospect_id = prospect.id
    db.commit()
    db.refresh(candidate)
    db.refresh(prospect)
    return prospect
