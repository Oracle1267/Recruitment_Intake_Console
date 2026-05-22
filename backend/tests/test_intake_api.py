from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient

from app.database import get_db
from app.main import create_app
from app.models import Base


def make_client():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_db():
        with session_factory() as db:
            yield db

    app = create_app()
    app.dependency_overrides[get_db] = override_db
    return TestClient(app)


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
        "source_type": "member_referral",
        "source_label": "Brother referral",
        "referred_by": "Sam W.",
        "event_name": None,
        "evidence": "Sam met Mason at orientation and thinks he is worth inviting.",
        "notes": "Follow up after first chapter event.",
    }
    values.update(overrides)
    return values


def test_intake_create_list_metrics_duplicate_and_promotion_flow():
    client = make_client()

    first = client.post("/intake-leads", json=intake_payload())
    second = client.post(
        "/intake-leads",
        json=intake_payload(
            source_type="event_check_in",
            source_label="Welcome BBQ",
            referred_by=None,
            event_name="Welcome BBQ",
            evidence="Mason checked in at the Welcome BBQ.",
        ),
    )
    leads = client.get("/intake-leads")
    metrics = client.get("/intake-metrics")
    duplicates = client.get("/intake-duplicates")
    promoted = client.post(f"/intake-leads/{first.json()['id']}/promote")
    prospects = client.get("/prospects")

    assert first.status_code == 201
    assert second.status_code == 201
    assert leads.status_code == 200
    assert len(leads.json()) == 2
    assert metrics.status_code == 200
    assert metrics.json()["total_leads"] == 2
    assert metrics.json()["needs_review"] == 2
    assert duplicates.status_code == 200
    assert duplicates.json()[0]["identity_key"] == "handle:masonrivera"
    assert promoted.status_code == 201
    assert promoted.json()["first_name"] == "Mason"
    assert prospects.json()[0]["source_platform"] == "Member referral"


def test_intake_csv_import_and_remove_flow():
    client = make_client()

    imported = client.post(
        "/intake-imports/csv",
        json={
            "source_label": "Orientation tabling sheet",
            "csv_text": """name,handle,email,interests,notes
Noah Bennett,@noahb,noah@example.com,"basketball, leadership",Met at table
""",
        },
    )
    lead_id = imported.json()["created_leads"][0]["id"]
    removed = client.patch(
        f"/intake-leads/{lead_id}",
        json={
            "status": "removed",
            "rejection_reason": "Not eligible for fraternity recruitment.",
        },
    )
    leads = client.get("/intake-leads")

    assert imported.status_code == 201
    assert imported.json()["created_count"] == 1
    assert imported.json()["created_leads"][0]["source_type"] == "csv_import"
    assert removed.status_code == 200
    assert removed.json()["status"] == "removed"
    assert leads.json()[0]["rejection_reason"] == "Not eligible for fraternity recruitment."


def test_intake_rejects_remove_without_reason():
    client = make_client()
    lead = client.post("/intake-leads", json=intake_payload())

    response = client.patch(
        f"/intake-leads/{lead.json()['id']}",
        json={"status": "removed"},
    )

    assert response.status_code == 400
    assert "requires a reason" in response.json()["detail"]
