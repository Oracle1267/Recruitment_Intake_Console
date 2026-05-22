from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models import (
    CollectionMethod,
    IntakeLeadStatus,
    IntakeSourceType,
    RecruitmentStatus,
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
    permission_confirmed: bool
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
    permission_confirmed: bool
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
