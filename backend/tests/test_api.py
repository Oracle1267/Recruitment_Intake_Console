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


def prospect_payload(**overrides):
    values = {
        "first_name": "Avery",
        "last_name": "Cole",
        "preferred_name": "Avery",
        "hometown": "Wichita, KS",
        "high_school": "East High",
        "major": "Nursing",
        "source_platform": "Member referral",
        "primary_handle": "@averycole",
        "source_url": None,
        "collection_method": "manual",
        "permission_confirmed": True,
        "interests": ["orientation", "volleyball"],
        "notes": "Chapter member referral note.",
    }
    values.update(overrides)
    return values


def test_health_check():
    client = make_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "rushintel-api"}


def test_create_and_list_prospects():
    client = make_client()

    created = client.post("/prospects", json=prospect_payload())
    listed = client.get("/prospects")

    assert created.status_code == 201
    assert created.json()["source_platform"] == "Member referral"
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [created.json()["id"]]


def test_rejects_unpermitted_prospect_payload():
    client = make_client()

    response = client.post(
        "/prospects",
        json=prospect_payload(permission_confirmed=False),
    )

    assert response.status_code == 400
    assert "permitted" in response.json()["detail"]


def test_updates_status_and_adds_activity():
    client = make_client()
    prospect_id = client.post("/prospects", json=prospect_payload()).json()["id"]

    status_response = client.patch(
        f"/prospects/{prospect_id}/status",
        json={"status": "engaged"},
    )
    note_response = client.post(
        f"/prospects/{prospect_id}/notes",
        json={"author": "Nick", "body": "Warm intro through chapter member."},
    )
    follow_up_response = client.post(
        f"/prospects/{prospect_id}/follow-ups",
        json={
            "owner": "Recruitment Chair",
            "due_date": "2026-06-01",
            "reason": "Invite to game night",
        },
    )

    assert status_response.status_code == 200
    assert status_response.json()["status"] == "engaged"
    assert note_response.status_code == 201
    assert note_response.json()["body"] == "Warm intro through chapter member."
    assert follow_up_response.status_code == 201
    assert follow_up_response.json()["completed"] is False


def test_suppression_blocks_matching_new_prospect():
    client = make_client()

    suppression = client.post(
        "/suppressions",
        json={
            "platform": "Member referral",
            "handle": "@averycole",
            "reason": "Asked not to be contacted.",
        },
    )
    blocked = client.post("/prospects", json=prospect_payload())

    assert suppression.status_code == 201
    assert blocked.status_code == 400
    assert "suppression list" in blocked.json()["detail"]
