import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, IntakeLeadStatus, IntakeSourceType, RecruitmentStatus
from app.schemas import IntakeCsvImportCreate, IntakeLeadCreate, IntakeLeadReviewUpdate
from app.services import (
    create_intake_lead,
    get_intake_metrics,
    import_intake_csv,
    list_intake_duplicate_groups,
    list_intake_leads,
    promote_intake_lead_to_prospect,
    update_intake_lead_status,
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


def intake_payload(**overrides):
    values = {
        "first_name": "Mason",
        "last_name": "Rivera",
        "preferred_name": "Mason",
        "primary_handle": "@masonrivera",
        "phone": "785-555-0142",
        "email": "mason@example.com",
        "hometown": "Topeka, KS",
        "high_school": "Washburn Rural",
        "interests": ["intramurals", "business"],
        "source_type": IntakeSourceType.member_referral,
        "source_label": "Brother referral",
        "referred_by": "Sam W.",
        "event_name": None,
        "evidence": "Sam met Mason at orientation and thinks he is worth inviting.",
        "notes": "Follow up after first chapter event.",
    }
    values.update(overrides)
    return IntakeLeadCreate(**values)


def test_create_intake_lead_records_referral_source(session):
    lead = create_intake_lead(session, intake_payload())
    leads = list_intake_leads(session)

    assert lead.id
    assert lead.status == IntakeLeadStatus.needs_review
    assert lead.source_type == IntakeSourceType.member_referral
    assert lead.referred_by == "Sam W."
    assert lead.primary_handle == "@masonrivera"
    assert lead.normalized_handle == "masonrivera"
    assert leads[0].first_name == "Mason"


def test_intake_metrics_summarize_source_mix_and_review_queue(session):
    create_intake_lead(session, intake_payload())
    create_intake_lead(
        session,
        intake_payload(
            first_name="Noah",
            last_name="Bennett",
            primary_handle=None,
            email="noah@example.com",
            source_type=IntakeSourceType.opt_in,
            source_label="Interest form",
            referred_by=None,
            evidence="Noah submitted the opt-in interest form.",
        ),
    )

    metrics = get_intake_metrics(session)

    assert metrics.total_leads == 2
    assert metrics.needs_review == 2
    assert metrics.promoted == 0
    assert metrics.source_mix[IntakeSourceType.member_referral] == 1
    assert metrics.source_mix[IntakeSourceType.opt_in] == 1


def test_intake_duplicate_groups_use_handle_email_or_name(session):
    create_intake_lead(session, intake_payload())
    create_intake_lead(
        session,
        intake_payload(
            source_type=IntakeSourceType.event_check_in,
            source_label="BBQ check-in",
            event_name="Welcome BBQ",
            referred_by=None,
            evidence="Mason checked in at the Welcome BBQ.",
        ),
    )
    create_intake_lead(
        session,
        intake_payload(
            first_name="Jordan",
            last_name="Hayes",
            primary_handle=None,
            email=None,
            source_type=IntakeSourceType.manual_entry,
            source_label="Manual note",
            evidence="Manual chapter note.",
        ),
    )
    create_intake_lead(
        session,
        intake_payload(
            first_name="Jordan",
            last_name="Hayes",
            primary_handle=None,
            email=None,
            source_type=IntakeSourceType.csv_import,
            source_label="CSV import",
            evidence="Imported from chapter spreadsheet.",
        ),
    )

    groups = list_intake_duplicate_groups(session)

    assert [(group.identity_key, group.count) for group in groups] == [
        ("handle:masonrivera", 2),
        ("name:jordan hayes", 2),
    ]


def test_csv_import_creates_intake_leads_with_source_context(session):
    result = import_intake_csv(
        session,
        IntakeCsvImportCreate(
            source_label="Orientation tabling sheet",
            csv_text="""name,handle,email,interests,notes
Noah Bennett,@noahb,noah@example.com,"basketball, leadership",Met at table
Micah Reed,,micah@example.com,gaming,Opted in for text follow-up
""",
        ),
    )
    leads = list_intake_leads(session)

    assert result.created_count == 2
    assert result.skipped_count == 0
    assert {lead.first_name for lead in leads} == {"Noah", "Micah"}
    assert all(lead.source_type == IntakeSourceType.csv_import for lead in leads)
    assert all(lead.source_label == "Orientation tabling sheet" for lead in leads)


def test_promote_intake_lead_creates_pipeline_prospect(session):
    lead = create_intake_lead(session, intake_payload())

    prospect = promote_intake_lead_to_prospect(session, lead.id)
    refreshed = list_intake_leads(session)[0]

    assert prospect.first_name == "Mason"
    assert prospect.last_name == "Rivera"
    assert prospect.status == RecruitmentStatus.identified
    assert prospect.source_platform == "Member referral"
    assert prospect.primary_handle == "@masonrivera"
    assert "Sam W." in (prospect.notes or "")
    assert refreshed.status == IntakeLeadStatus.promoted
    assert refreshed.promoted_prospect_id == prospect.id


def test_intake_lead_can_be_removed_with_reason(session):
    lead = create_intake_lead(session, intake_payload())

    removed = update_intake_lead_status(
        session,
        lead.id,
        IntakeLeadReviewUpdate(
            status=IntakeLeadStatus.removed,
            rejection_reason="Not eligible for fraternity recruitment.",
        ),
    )

    assert removed.status == IntakeLeadStatus.removed
    assert removed.rejection_reason == "Not eligible for fraternity recruitment."


def test_rejected_or_removed_intake_requires_reason(session):
    lead = create_intake_lead(session, intake_payload())

    with pytest.raises(ValueError, match="requires a reason"):
        update_intake_lead_status(
            session,
            lead.id,
            IntakeLeadReviewUpdate(status=IntakeLeadStatus.rejected),
        )
