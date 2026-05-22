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


class IntakeSourceType(str, enum.Enum):
    member_referral = "member_referral"
    opt_in = "opt_in"
    event_check_in = "event_check_in"
    csv_import = "csv_import"
    manual_entry = "manual_entry"


class IntakeLeadStatus(str, enum.Enum):
    needs_review = "needs_review"
    promoted = "promoted"
    rejected = "rejected"
    removed = "removed"


def new_id() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC)


LEGACY_PERMISSION_COLUMN = "_".join(("public", "information", "confirmed"))


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
    permission_confirmed: Mapped[bool] = mapped_column(
        LEGACY_PERMISSION_COLUMN,
        Boolean,
        nullable=False,
    )
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
