from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, CollectionMethod, RecruitmentStatus
from app.schemas import FollowUpCreate, NoteCreate, ProspectCreate, SuppressionCreate
from app.services import (
    add_follow_up,
    add_note,
    create_prospect,
    list_prospects,
    suppress_identity,
    update_prospect_status,
)


@pytest.fixture()
def session():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with session_factory() as db:
        yield db


def prospect_payload(**overrides):
    values = {
        "first_name": "Mason",
        "last_name": "Rivera",
        "preferred_name": "Mason",
        "hometown": "Topeka, KS",
        "high_school": "Washburn Rural",
        "major": "Business",
        "source_platform": "Member referral",
        "primary_handle": "@masonrivera",
        "source_url": None,
        "collection_method": CollectionMethod.manual,
        "permission_confirmed": True,
        "interests": ["orientation", "basketball"],
        "notes": "Met during move-in volunteering.",
    }
    values.update(overrides)
    return ProspectCreate(**values)


def test_create_manual_prospect_records_source_provenance(session):
    prospect = create_prospect(session, prospect_payload())

    assert prospect.id
    assert prospect.first_name == "Mason"
    assert prospect.status == RecruitmentStatus.identified
    assert prospect.source_platform == "Member referral"
    assert prospect.source_url is None
    assert prospect.collection_method == CollectionMethod.manual
    assert prospect.permission_confirmed is True

    assert [item.id for item in list_prospects(session)] == [prospect.id]


def test_create_prospect_rejects_unpermitted_collection(session):
    payload = prospect_payload(permission_confirmed=False)

    with pytest.raises(ValueError, match="permitted"):
        create_prospect(session, payload)


def test_update_pipeline_status(session):
    prospect = create_prospect(session, prospect_payload())

    updated = update_prospect_status(session, prospect.id, RecruitmentStatus.engaged)

    assert updated.status == RecruitmentStatus.engaged


def test_add_note_and_follow_up_reminder(session):
    prospect = create_prospect(session, prospect_payload())

    note = add_note(
        session,
        prospect.id,
        NoteCreate(author="Nick", body="Has a warm intro through Sam."),
    )
    follow_up = add_follow_up(
        session,
        prospect.id,
        FollowUpCreate(
            owner="Recruitment Chair",
            due_date=date(2026, 6, 1),
            reason="Invite to cookout",
        ),
    )

    assert note.body == "Has a warm intro through Sam."
    assert follow_up.reason == "Invite to cookout"
    assert follow_up.completed is False


def test_suppression_blocks_duplicate_active_lead_by_platform_and_handle(session):
    suppression = suppress_identity(
        session,
        SuppressionCreate(
            platform="Member referral",
            handle="@masonrivera",
            reason="Asked not to be contacted.",
        ),
    )

    assert suppression.id

    with pytest.raises(ValueError, match="suppression list"):
        create_prospect(session, prospect_payload())
