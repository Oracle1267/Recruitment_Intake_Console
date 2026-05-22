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


def source_payload(**overrides):
    values = {
        "name": "Washburn Orientation Posts",
        "url": "https://example.edu/orientation",
        "source_type": "orientation_page",
        "source_platform": "Public web",
        "public_access_confirmed": True,
        "robots_check_required": True,
        "notes": "User-provided public page.",
    }
    values.update(overrides)
    return values


def test_discovery_source_run_candidate_review_and_promotion_flow():
    client = make_client()

    source_response = client.post("/discovery-sources", json=source_payload())
    source_id = source_response.json()["id"]

    run_response = client.post(
        "/discovery-runs",
        json={
            "source_id": source_id,
            "html_override": "<p>Avery Cole is an incoming freshman at Washburn University. Instagram @averycole.</p>",
        },
    )
    candidates_response = client.get("/candidate-leads")
    candidate = candidates_response.json()[0]
    approved_response = client.patch(
        f"/candidate-leads/{candidate['id']}",
        json={"status": "approved"},
    )
    promoted_response = client.post(f"/candidate-leads/{candidate['id']}/promote")
    prospects_response = client.get("/prospects")

    assert source_response.status_code == 201
    assert run_response.status_code == 201
    assert run_response.json()["candidates_found"] == 1
    assert candidates_response.status_code == 200
    assert candidate["display_name"] == "Avery Cole"
    assert candidate["status"] == "needs_review"
    assert approved_response.status_code == 200
    assert approved_response.json()["status"] == "approved"
    assert promoted_response.status_code == 201
    assert promoted_response.json()["first_name"] == "Avery"
    assert prospects_response.json()[0]["primary_handle"] == "@averycole"


def test_source_expansion_query_import_duplicate_and_coverage_flow():
    client = make_client()

    query_response = client.post(
        "/saved-search-queries",
        json={
            "label": "Washburn incoming class search",
            "query": '"Washburn University" "incoming freshman"',
            "source_type": "public_web_page",
            "source_platform": "Search",
            "source_url": "https://www.google.com/search?q=Washburn+incoming+freshman",
            "public_access_confirmed": True,
            "notes": "Manual public search recipe.",
        },
    )
    query_id = query_response.json()["id"]
    import_response = client.post(
        "/source-imports",
        json={
            "saved_search_query_id": query_id,
            "name": "Manual result paste",
            "url": "https://www.google.com/search?q=Washburn+incoming+freshman",
            "source_type": "public_web_page",
            "source_platform": "Search",
            "public_access_confirmed": True,
            "pasted_results": """
            Avery Cole is an incoming freshman at Washburn University. Instagram @averycole.
            Avery Cole posted publicly about Washburn orientation. Instagram @averycole.
            Noah Bennett announced he is an incoming freshman at Washburn University.
            """,
            "notes": "Reviewer pasted public snippets.",
        },
    )
    queries_response = client.get("/saved-search-queries")
    candidates_response = client.get("/candidate-leads")
    duplicates_response = client.get("/candidate-duplicates")
    coverage_response = client.get("/discovery-coverage?expected_male_pool=430")

    assert query_response.status_code == 201
    assert import_response.status_code == 201
    assert import_response.json()["candidates_created"] == 3
    assert queries_response.status_code == 200
    assert queries_response.json()[0]["query"] == '"Washburn University" "incoming freshman"'
    assert candidates_response.status_code == 200
    assert len(candidates_response.json()) == 3
    assert duplicates_response.status_code == 200
    assert duplicates_response.json()[0]["identity_key"] == "handle:averycole"
    assert coverage_response.status_code == 200
    assert coverage_response.json()["usable_leads"] == 2
    assert coverage_response.json()["coverage_percent"] == 0.47


def test_saved_search_query_can_be_deleted_from_dropdown_list():
    client = make_client()
    query_response = client.post(
        "/saved-search-queries",
        json={
            "label": "Bad query",
            "query": "bad query",
            "source_type": "public_web_page",
            "source_platform": "Search",
            "source_url": "https://www.google.com/search?q=bad+query",
            "public_access_confirmed": True,
            "notes": "Mistyped search recipe.",
        },
    )

    delete_response = client.delete(f"/saved-search-queries/{query_response.json()['id']}")
    list_response = client.get("/saved-search-queries")

    assert delete_response.status_code == 200
    assert delete_response.json()["active"] is False
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_source_atlas_create_import_report_and_archive_flow():
    client = make_client()

    atlas_response = client.post(
        "/source-atlas",
        json={
            "name": "Washburn football roster",
            "url": "https://wusports.com/sports/football/roster",
            "category": "athletics",
            "source_type": "athletics_roster",
            "source_platform": "WUsports",
            "public_access_confirmed": True,
            "priority": 5,
            "review_cadence_days": 14,
            "notes": "Official public athletics roster.",
        },
    )
    atlas_id = atlas_response.json()["id"]
    import_response = client.post(
        "/source-imports",
        json={
            "source_atlas_entry_id": atlas_id,
            "name": "Football roster paste",
            "url": "https://wusports.com/sports/football/roster",
            "source_type": "athletics_roster",
            "source_platform": "WUsports",
            "public_access_confirmed": True,
            "pasted_results": """
            Price Hamilton is a freshman at Washburn on the public football roster.
            Connor Flaherty is a redshirt freshman at Washburn on the public football roster.
            """,
            "notes": "Reviewer pasted public roster rows.",
        },
    )
    list_response = client.get("/source-atlas")
    report_response = client.get("/source-atlas/report")
    archive_response = client.delete(f"/source-atlas/{atlas_id}")
    active_after_archive = client.get("/source-atlas")

    assert atlas_response.status_code == 201
    assert atlas_response.json()["category"] == "athletics"
    assert import_response.status_code == 201
    assert import_response.json()["candidates_created"] == 2
    assert list_response.status_code == 200
    assert list_response.json()[0]["name"] == "Washburn football roster"
    assert report_response.status_code == 200
    assert report_response.json()[0]["import_count"] == 1
    assert report_response.json()[0]["total_candidates"] == 2
    assert report_response.json()[0]["usable_leads"] == 2
    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"
    assert active_after_archive.json() == []


def test_washburn_source_setup_endpoint_seeds_public_collection_pack():
    client = make_client()

    response = client.post("/source-setup/washburn")
    atlas_response = client.get("/source-atlas")
    query_response = client.get("/saved-search-queries")
    second_response = client.post("/source-setup/washburn")

    assert response.status_code == 200
    assert response.json()["atlas_sources_created"] >= 10
    assert response.json()["saved_searches_created"] >= 8
    assert response.json()["created_source_names"][0]
    assert response.json()["created_search_labels"][0]
    assert atlas_response.status_code == 200
    assert len(atlas_response.json()) == response.json()["atlas_sources_created"]
    assert query_response.status_code == 200
    assert len(query_response.json()) == response.json()["saved_searches_created"]
    assert second_response.status_code == 200
    assert second_response.json()["atlas_sources_created"] == 0
    assert second_response.json()["saved_searches_created"] == 0


def test_candidate_and_promoted_prospect_can_be_removed_later():
    client = make_client()
    source_id = client.post("/discovery-sources", json=source_payload()).json()["id"]
    client.post(
        "/discovery-runs",
        json={
            "source_id": source_id,
            "html_override": "<p>Jordan Hayes is an incoming freshman at Washburn University.</p>",
        },
    )
    candidate_id = client.get("/candidate-leads").json()[0]["id"]

    approved = client.patch(
        f"/candidate-leads/{candidate_id}",
        json={"status": "approved"},
    )
    removed_candidate = client.patch(
        f"/candidate-leads/{candidate_id}",
        json={
            "status": "removed",
            "rejection_reason": "Not fraternity-relevant after manual review.",
        },
    )
    client.patch(
        f"/candidate-leads/{candidate_id}",
        json={"status": "approved"},
    )
    promoted = client.post(f"/candidate-leads/{candidate_id}/promote")
    removed_prospect = client.post(
        f"/prospects/{promoted.json()['id']}/remove",
        json={"reason": "Determined N/A after chapter review."},
    )

    assert approved.status_code == 200
    assert removed_candidate.status_code == 200
    assert removed_candidate.json()["status"] == "removed"
    assert promoted.status_code == 201
    assert removed_prospect.status_code == 200
    assert removed_prospect.json()["status"] == "not_applicable"


def test_discovery_rejects_unconfirmed_public_source():
    client = make_client()

    response = client.post(
        "/discovery-sources",
        json=source_payload(public_access_confirmed=False),
    )

    assert response.status_code == 400
    assert "public access" in response.json()["detail"]
