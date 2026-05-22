from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models import (
    CandidateStatus,
    CollectionMethod,
    DiscoveryRunStatus,
    DiscoverySourceType,
    IntakeLeadStatus,
    IntakeSourceType,
    RecruitmentStatus,
    SourceAtlasCategory,
    SourceAtlasStatus,
)


class ProspectCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str | None = None
    preferred_name: str | None = None
    hometown: str | None = None
    high_school: str | None = None
    major: str | None = None
    source_platform: str = Field(min_length=1, max_length=80)
    primary_handle: str | None = None
    source_url: str | None = None
    collection_method: CollectionMethod = CollectionMethod.manual
    public_information_confirmed: bool
    interests: list[str] = Field(default_factory=list)
    notes: str | None = None
    rush_score: int = Field(default=0, ge=0, le=100)
    status: RecruitmentStatus = RecruitmentStatus.identified


class ProspectRead(BaseModel):
    id: str
    first_name: str
    last_name: str | None
    preferred_name: str | None
    hometown: str | None
    high_school: str | None
    major: str | None
    rush_score: int
    status: RecruitmentStatus
    interests: list[str]
    notes: str | None
    source_platform: str
    primary_handle: str | None
    source_url: str | None
    collection_method: CollectionMethod
    public_information_confirmed: bool
    suppressed: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StatusUpdate(BaseModel):
    status: RecruitmentStatus


class NoteCreate(BaseModel):
    author: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1)


class NoteRead(BaseModel):
    id: str
    prospect_id: str
    author: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FollowUpCreate(BaseModel):
    owner: str = Field(min_length=1, max_length=120)
    due_date: date
    reason: str = Field(min_length=1, max_length=240)


class FollowUpRead(BaseModel):
    id: str
    prospect_id: str
    owner: str
    due_date: date
    reason: str
    completed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SuppressionCreate(BaseModel):
    platform: str = Field(min_length=1, max_length=80)
    handle: str = Field(min_length=1, max_length=120)
    reason: str = Field(min_length=1)


class SuppressionRead(BaseModel):
    id: str
    platform: str
    handle: str
    reason: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DiscoverySourceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    url: str = Field(min_length=1, max_length=500)
    source_type: DiscoverySourceType
    source_platform: str = Field(min_length=1, max_length=80)
    public_access_confirmed: bool
    robots_check_required: bool = True
    notes: str | None = None


class DiscoverySourceRead(BaseModel):
    id: str
    name: str
    url: str
    source_type: DiscoverySourceType
    source_platform: str
    public_access_confirmed: bool
    robots_check_required: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiscoveryRunCreate(BaseModel):
    source_id: str
    html_override: str | None = Field(default=None, max_length=250_000)


class DiscoveryRunRead(BaseModel):
    id: str
    source_id: str
    status: DiscoveryRunStatus
    robots_allowed: bool
    http_status: int | None
    candidates_found: int
    error: str | None
    started_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class CandidateLeadRead(BaseModel):
    id: str
    source_id: str
    run_id: str
    display_name: str | None
    handle: str | None
    source_platform: str
    source_url: str
    evidence: str
    rationale: str
    confidence_score: int
    status: CandidateStatus
    rejection_reason: str | None
    promoted_prospect_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CandidateReviewUpdate(BaseModel):
    status: CandidateStatus
    rejection_reason: str | None = None


class RemovalCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class IntakeLeadCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str | None = None
    preferred_name: str | None = None
    primary_handle: str | None = None
    phone: str | None = None
    email: str | None = None
    hometown: str | None = None
    high_school: str | None = None
    interests: list[str] = Field(default_factory=list)
    source_type: IntakeSourceType
    source_label: str = Field(min_length=1, max_length=160)
    referred_by: str | None = None
    event_name: str | None = None
    evidence: str = Field(min_length=1, max_length=1_000)
    notes: str | None = None


class IntakeLeadRead(BaseModel):
    id: str
    first_name: str
    last_name: str | None
    preferred_name: str | None
    primary_handle: str | None
    phone: str | None
    email: str | None
    hometown: str | None
    high_school: str | None
    interests: list[str]
    source_type: IntakeSourceType
    source_label: str
    referred_by: str | None
    event_name: str | None
    evidence: str
    notes: str | None
    status: IntakeLeadStatus
    rejection_reason: str | None
    promoted_prospect_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IntakeLeadReviewUpdate(BaseModel):
    status: IntakeLeadStatus
    rejection_reason: str | None = None


class IntakeCsvImportCreate(BaseModel):
    source_label: str = Field(min_length=1, max_length=160)
    csv_text: str = Field(min_length=1, max_length=250_000)


class IntakeCsvImportResult(BaseModel):
    created_count: int
    skipped_count: int
    errors: list[str]
    created_leads: list[IntakeLeadRead]


class IntakeDuplicateGroup(BaseModel):
    identity_key: str
    label: str
    count: int
    statuses: list[IntakeLeadStatus]
    leads: list[IntakeLeadRead]


class IntakeMetricsRead(BaseModel):
    total_leads: int
    needs_review: int
    promoted: int
    removed: int
    duplicate_groups: int
    source_mix: dict[IntakeSourceType, int]


class SavedSearchQueryCreate(BaseModel):
    label: str = Field(min_length=1, max_length=160)
    query: str = Field(min_length=1, max_length=500)
    source_type: DiscoverySourceType
    source_platform: str = Field(min_length=1, max_length=80)
    source_url: str = Field(min_length=1, max_length=500)
    public_access_confirmed: bool
    notes: str | None = None


class SavedSearchQueryRead(BaseModel):
    id: str
    label: str
    query: str
    source_type: DiscoverySourceType
    source_platform: str
    source_url: str
    public_access_confirmed: bool
    notes: str | None
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PublicResultsImportCreate(BaseModel):
    saved_search_query_id: str | None = None
    source_atlas_entry_id: str | None = None
    name: str = Field(min_length=1, max_length=160)
    url: str = Field(min_length=1, max_length=500)
    source_type: DiscoverySourceType
    source_platform: str = Field(min_length=1, max_length=80)
    public_access_confirmed: bool
    pasted_results: str = Field(min_length=1, max_length=250_000)
    notes: str | None = None


class SourceImportBatchRead(BaseModel):
    id: str
    saved_search_query_id: str | None
    source_id: str
    run_id: str
    import_method: str
    public_access_confirmed: bool
    pasted_results_excerpt: str
    candidates_created: int
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CandidateDuplicateGroup(BaseModel):
    identity_key: str
    label: str
    count: int
    statuses: list[CandidateStatus]
    candidates: list[CandidateLeadRead]


class DiscoveryCoverageRequest(BaseModel):
    expected_male_pool: int = Field(default=430, ge=1, le=100_000)


class DiscoveryCoverageRead(BaseModel):
    total_candidates: int
    unique_candidates: int
    usable_leads: int
    expected_male_pool: int
    coverage_percent: float


class SourceAtlasCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    url: str = Field(min_length=1, max_length=500)
    category: SourceAtlasCategory
    source_type: DiscoverySourceType
    source_platform: str = Field(min_length=1, max_length=80)
    public_access_confirmed: bool
    priority: int = Field(default=3, ge=1, le=5)
    review_cadence_days: int = Field(default=14, ge=1, le=365)
    notes: str | None = None


class SourceAtlasRead(BaseModel):
    id: str
    name: str
    url: str
    category: SourceAtlasCategory
    source_type: DiscoverySourceType
    source_platform: str
    public_access_confirmed: bool
    priority: int
    review_cadence_days: int
    notes: str | None
    status: SourceAtlasStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SourceAtlasReportItem(BaseModel):
    source: SourceAtlasRead
    import_count: int
    total_candidates: int
    usable_leads: int
    last_imported_at: datetime | None


class SourceSetupResult(BaseModel):
    atlas_sources_created: int
    atlas_sources_skipped: int
    saved_searches_created: int
    saved_searches_skipped: int
    created_source_names: list[str]
    created_search_labels: list[str]
