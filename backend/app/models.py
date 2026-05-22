from __future__ import annotations

import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class RecruitmentStatus(str, enum.Enum):
    identified = "identified"
    researched = "researched"
    initial_contact = "initial_contact"
    engaged = "engaged"
    event_attended = "event_attended"
    strong_interest = "strong_interest"
    bid_offered = "bid_offered"
    accepted = "accepted"
    declined = "declined"
    lost_contact = "lost_contact"
    not_applicable = "not_applicable"


class CollectionMethod(str, enum.Enum):
    manual = "manual"
    assisted = "assisted"
    public_scraping = "public_scraping"


class DiscoverySourceType(str, enum.Enum):
    public_web_page = "public_web_page"
    athletics_roster = "athletics_roster"
    orientation_page = "orientation_page"
    hashtag_page = "hashtag_page"
    public_social_profile = "public_social_profile"


class DiscoveryRunStatus(str, enum.Enum):
    completed = "completed"
    blocked = "blocked"
    failed = "failed"


class CandidateStatus(str, enum.Enum):
    needs_review = "needs_review"
    approved = "approved"
    rejected = "rejected"
    suppressed = "suppressed"
    promoted = "promoted"
    removed = "removed"


class ImportMethod(str, enum.Enum):
    pasted_public_results = "pasted_public_results"


class IntakeSourceType(str, enum.Enum):
    member_referral = "member_referral"
    opt_in = "opt_in"
    event_check_in = "event_check_in"
    csv_import = "csv_import"
    manual_entry = "manual_entry"
    public_source = "public_source"


class IntakeLeadStatus(str, enum.Enum):
    needs_review = "needs_review"
    promoted = "promoted"
    rejected = "rejected"
    removed = "removed"


class SourceAtlasCategory(str, enum.Enum):
    institutional = "institutional"
    athletics = "athletics"
    student_org = "student_org"
    campus_event = "campus_event"
    local_news = "local_news"
    high_school = "high_school"
    opt_in = "opt_in"
    member_referral = "member_referral"


class SourceAtlasStatus(str, enum.Enum):
    active = "active"
    archived = "archived"


def new_id() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


class Prospect(Base):
    __tablename__ = "prospects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    preferred_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    hometown: Mapped[str | None] = mapped_column(String(120), nullable=True)
    high_school: Mapped[str | None] = mapped_column(String(160), nullable=True)
    major: Mapped[str | None] = mapped_column(String(120), nullable=True)
    rush_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[RecruitmentStatus] = mapped_column(
        Enum(RecruitmentStatus),
        nullable=False,
        default=RecruitmentStatus.identified,
    )
    interests: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_platform: Mapped[str] = mapped_column(String(80), nullable=False)
    primary_handle: Mapped[str | None] = mapped_column(String(120), nullable=True)
    normalized_handle: Mapped[str | None] = mapped_column(String(120), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    collection_method: Mapped[CollectionMethod] = mapped_column(
        Enum(CollectionMethod),
        nullable=False,
        default=CollectionMethod.manual,
    )
    public_information_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    suppressed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    internal_notes: Mapped[list["ProspectNote"]] = relationship(
        back_populates="prospect",
        cascade="all, delete-orphan",
    )
    follow_ups: Mapped[list["FollowUpTask"]] = relationship(
        back_populates="prospect",
        cascade="all, delete-orphan",
    )


class ProspectNote(Base):
    __tablename__ = "prospect_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    prospect_id: Mapped[str] = mapped_column(ForeignKey("prospects.id"), nullable=False)
    author: Mapped[str] = mapped_column(String(120), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    prospect: Mapped[Prospect] = relationship(back_populates="internal_notes")


class FollowUpTask(Base):
    __tablename__ = "follow_up_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    prospect_id: Mapped[str] = mapped_column(ForeignKey("prospects.id"), nullable=False)
    owner: Mapped[str] = mapped_column(String(120), nullable=False)
    due_date: Mapped[Date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(String(240), nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    prospect: Mapped[Prospect] = relationship(back_populates="follow_ups")


class SuppressionEntry(Base):
    __tablename__ = "suppression_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    platform: Mapped[str] = mapped_column(String(80), nullable=False)
    normalized_platform: Mapped[str] = mapped_column(String(80), nullable=False)
    handle: Mapped[str] = mapped_column(String(120), nullable=False)
    normalized_handle: Mapped[str] = mapped_column(String(120), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class IntakeLead(Base):
    __tablename__ = "intake_leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    preferred_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    primary_handle: Mapped[str | None] = mapped_column(String(120), nullable=True)
    normalized_handle: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(80), nullable=True)
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    normalized_email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    hometown: Mapped[str | None] = mapped_column(String(120), nullable=True)
    high_school: Mapped[str | None] = mapped_column(String(160), nullable=True)
    interests: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    source_type: Mapped[IntakeSourceType] = mapped_column(
        Enum(IntakeSourceType),
        nullable=False,
    )
    source_label: Mapped[str] = mapped_column(String(160), nullable=False)
    referred_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    event_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[IntakeLeadStatus] = mapped_column(
        Enum(IntakeLeadStatus),
        nullable=False,
        default=IntakeLeadStatus.needs_review,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    promoted_prospect_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )


class DiscoverySource(Base):
    __tablename__ = "discovery_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    source_type: Mapped[DiscoverySourceType] = mapped_column(
        Enum(DiscoverySourceType),
        nullable=False,
    )
    source_platform: Mapped[str] = mapped_column(String(80), nullable=False)
    public_access_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    robots_check_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    runs: Mapped[list["DiscoveryRun"]] = relationship(
        back_populates="source",
        cascade="all, delete-orphan",
    )
    candidates: Mapped[list["CandidateLead"]] = relationship(
        back_populates="source",
        cascade="all, delete-orphan",
    )


class SavedSearchQuery(Base):
    __tablename__ = "saved_search_queries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    query: Mapped[str] = mapped_column(String(500), nullable=False)
    source_type: Mapped[DiscoverySourceType] = mapped_column(
        Enum(DiscoverySourceType),
        nullable=False,
    )
    source_platform: Mapped[str] = mapped_column(String(80), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    public_access_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    imports: Mapped[list["SourceImportBatch"]] = relationship(
        back_populates="saved_search_query",
        cascade="all, delete-orphan",
    )


class SourceAtlasEntry(Base):
    __tablename__ = "source_atlas_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[SourceAtlasCategory] = mapped_column(
        Enum(SourceAtlasCategory),
        nullable=False,
    )
    source_type: Mapped[DiscoverySourceType] = mapped_column(
        Enum(DiscoverySourceType),
        nullable=False,
    )
    source_platform: Mapped[str] = mapped_column(String(80), nullable=False)
    public_access_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    review_cadence_days: Mapped[int] = mapped_column(Integer, nullable=False, default=14)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[SourceAtlasStatus] = mapped_column(
        Enum(SourceAtlasStatus),
        nullable=False,
        default=SourceAtlasStatus.active,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    links: Mapped[list["SourceAtlasImportLink"]] = relationship(
        back_populates="source_atlas_entry",
        cascade="all, delete-orphan",
    )


class DiscoveryRun(Base):
    __tablename__ = "discovery_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    source_id: Mapped[str] = mapped_column(ForeignKey("discovery_sources.id"), nullable=False)
    status: Mapped[DiscoveryRunStatus] = mapped_column(Enum(DiscoveryRunStatus), nullable=False)
    robots_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    candidates_found: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    source: Mapped[DiscoverySource] = relationship(back_populates="runs")
    candidates: Mapped[list["CandidateLead"]] = relationship(
        back_populates="run",
        cascade="all, delete-orphan",
    )


class SourceImportBatch(Base):
    __tablename__ = "source_import_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    saved_search_query_id: Mapped[str | None] = mapped_column(
        ForeignKey("saved_search_queries.id"),
        nullable=True,
    )
    source_id: Mapped[str] = mapped_column(ForeignKey("discovery_sources.id"), nullable=False)
    run_id: Mapped[str] = mapped_column(ForeignKey("discovery_runs.id"), nullable=False)
    import_method: Mapped[ImportMethod] = mapped_column(
        Enum(ImportMethod),
        nullable=False,
        default=ImportMethod.pasted_public_results,
    )
    public_access_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    pasted_results_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    candidates_created: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    saved_search_query: Mapped[SavedSearchQuery | None] = relationship(back_populates="imports")
    source: Mapped[DiscoverySource] = relationship()
    run: Mapped[DiscoveryRun] = relationship()


class SourceAtlasImportLink(Base):
    __tablename__ = "source_atlas_import_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    source_atlas_entry_id: Mapped[str] = mapped_column(
        ForeignKey("source_atlas_entries.id"),
        nullable=False,
    )
    source_id: Mapped[str] = mapped_column(ForeignKey("discovery_sources.id"), nullable=False)
    run_id: Mapped[str] = mapped_column(ForeignKey("discovery_runs.id"), nullable=False)
    source_import_batch_id: Mapped[str | None] = mapped_column(
        ForeignKey("source_import_batches.id"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    source_atlas_entry: Mapped[SourceAtlasEntry] = relationship(back_populates="links")
    source: Mapped[DiscoverySource] = relationship()
    run: Mapped[DiscoveryRun] = relationship()
    source_import_batch: Mapped[SourceImportBatch | None] = relationship()


class CandidateLead(Base):
    __tablename__ = "candidate_leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    source_id: Mapped[str] = mapped_column(ForeignKey("discovery_sources.id"), nullable=False)
    run_id: Mapped[str] = mapped_column(ForeignKey("discovery_runs.id"), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    handle: Mapped[str | None] = mapped_column(String(120), nullable=True)
    normalized_handle: Mapped[str | None] = mapped_column(String(120), nullable=True)
    source_platform: Mapped[str] = mapped_column(String(80), nullable=False)
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[CandidateStatus] = mapped_column(
        Enum(CandidateStatus),
        nullable=False,
        default=CandidateStatus.needs_review,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    promoted_prospect_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
    )

    source: Mapped[DiscoverySource] = relationship(back_populates="candidates")
    run: Mapped[DiscoveryRun] = relationship(back_populates="candidates")
