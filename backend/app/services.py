from __future__ import annotations

import csv
from io import StringIO

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    CollectionMethod,
    FollowUpTask,
    IntakeLead,
    IntakeLeadStatus,
    IntakeSourceType,
    Prospect,
    ProspectNote,
    RecruitmentStatus,
    SuppressionEntry,
)
from app.schemas import (
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
    RemovalCreate,
    SuppressionCreate,
)


def normalize_identity(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    if normalized.startswith("@"):
        normalized = normalized[1:]
    return normalized or None


def normalize_platform(value: str) -> str:
    return value.strip().lower()


def ensure_collection_allowed(payload: ProspectCreate) -> None:
    if not payload.permission_confirmed:
        raise ValueError("Prospect collection must be confirmed as permitted.")


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
    ensure_collection_allowed(payload)
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
        permission_confirmed=payload.permission_confirmed,
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
        raise ValueError("This status requires a reason.")
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
        "Promoted from intake lead.",
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
            permission_confirmed=True,
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
