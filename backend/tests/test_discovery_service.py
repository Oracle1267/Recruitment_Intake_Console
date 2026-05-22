import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import (
    Base,
    CandidateStatus,
    CollectionMethod,
    DiscoverySourceType,
    SourceAtlasCategory,
    SourceAtlasStatus,
)
from app.schemas import (
    CandidateReviewUpdate,
    DiscoveryCoverageRequest,
    DiscoveryRunCreate,
    DiscoverySourceCreate,
    PublicResultsImportCreate,
    RemovalCreate,
    SavedSearchQueryCreate,
    SourceAtlasCreate,
)
from app.services import (
    archive_source_atlas_entry,
    create_discovery_source,
    create_saved_search_query,
    create_source_atlas_entry,
    delete_saved_search_query,
    get_discovery_coverage,
    get_source_atlas_report,
    get_candidate_lead,
    import_public_results,
    list_candidate_duplicate_groups,
    list_candidate_leads,
    list_source_atlas_entries,
    list_saved_search_queries,
    promote_candidate_to_prospect,
    remove_prospect,
    run_discovery,
    seed_washburn_source_pack,
    update_candidate_status,
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


def source_payload(**overrides):
    values = {
        "name": "Washburn Orientation Posts",
        "url": "https://example.edu/orientation",
        "source_type": DiscoverySourceType.orientation_page,
        "source_platform": "Public web",
        "public_access_confirmed": True,
        "robots_check_required": True,
        "notes": "User-provided public orientation page.",
    }
    values.update(overrides)
    return DiscoverySourceCreate(**values)


def saved_query_payload(**overrides):
    values = {
        "label": "Washburn incoming class search",
        "query": '"Washburn University" "incoming freshman"',
        "source_type": DiscoverySourceType.public_web_page,
        "source_platform": "Search",
        "source_url": "https://www.google.com/search?q=Washburn+incoming+freshman",
        "public_access_confirmed": True,
        "notes": "Manual search recipe for public pages.",
    }
    values.update(overrides)
    return SavedSearchQueryCreate(**values)


def atlas_payload(**overrides):
    values = {
        "name": "Washburn football roster",
        "url": "https://wusports.com/sports/football/roster",
        "category": SourceAtlasCategory.athletics,
        "source_type": DiscoverySourceType.athletics_roster,
        "source_platform": "WUsports",
        "public_access_confirmed": True,
        "priority": 5,
        "review_cadence_days": 14,
        "notes": "Official public athletics roster.",
    }
    values.update(overrides)
    return SourceAtlasCreate(**values)


def test_create_discovery_source_requires_public_confirmation(session):
    source = create_discovery_source(session, source_payload())

    assert source.id
    assert source.url == "https://example.edu/orientation"
    assert source.public_access_confirmed is True

    with pytest.raises(ValueError, match="public access"):
        create_discovery_source(
            session,
            source_payload(
                url="https://example.edu/private",
                public_access_confirmed=False,
            ),
        )


def test_saved_search_query_requires_public_confirmation(session):
    query = create_saved_search_query(session, saved_query_payload())
    saved = list_saved_search_queries(session)

    assert query.id
    assert saved[0].query == '"Washburn University" "incoming freshman"'
    assert saved[0].public_access_confirmed is True

    with pytest.raises(ValueError, match="public access"):
        create_saved_search_query(
            session,
            saved_query_payload(
                source_url="https://www.google.com/search?q=private",
                public_access_confirmed=False,
            ),
        )


def test_saved_search_query_can_be_removed_from_active_list(session):
    query = create_saved_search_query(session, saved_query_payload())

    removed = delete_saved_search_query(session, query.id)
    saved = list_saved_search_queries(session)

    assert removed.active is False
    assert saved == []


def test_source_atlas_entry_requires_public_confirmation(session):
    entry = create_source_atlas_entry(session, atlas_payload())
    entries = list_source_atlas_entries(session)

    assert entry.id
    assert entry.category == SourceAtlasCategory.athletics
    assert entry.status == SourceAtlasStatus.active
    assert entries[0].url == "https://wusports.com/sports/football/roster"

    with pytest.raises(ValueError, match="public access"):
        create_source_atlas_entry(
            session,
            atlas_payload(
                url="https://wusports.com/private",
                public_access_confirmed=False,
            ),
        )


def test_source_atlas_entry_can_be_archived_without_deleting_history(session):
    entry = create_source_atlas_entry(session, atlas_payload())

    archived = archive_source_atlas_entry(session, entry.id)
    active_entries = list_source_atlas_entries(session)

    assert archived.status == SourceAtlasStatus.archived
    assert active_entries == []


def test_washburn_source_pack_bootstraps_public_sources_and_queries(session):
    result = seed_washburn_source_pack(session)
    entries = list_source_atlas_entries(session)
    queries = list_saved_search_queries(session)

    assert result.atlas_sources_created >= 10
    assert result.atlas_sources_skipped == 0
    assert result.saved_searches_created >= 8
    assert result.saved_searches_skipped == 0
    assert len(entries) == result.atlas_sources_created
    assert len(queries) == result.saved_searches_created
    assert "Washburn new student orientation" in result.created_source_names
    assert "Washburn incoming class" in result.created_search_labels
    assert any(entry.url == "https://www.washburn.edu/admissions/admitted/orientation.html" for entry in entries)
    assert any(entry.url == "https://wusports.com/sports/football/roster" for entry in entries)
    assert any(query.query == '"Washburn University" "incoming freshman"' for query in queries)
    assert all(entry.public_access_confirmed for entry in entries)
    assert all(query.public_access_confirmed for query in queries)

    second_result = seed_washburn_source_pack(session)

    assert second_result.atlas_sources_created == 0
    assert second_result.saved_searches_created == 0
    assert second_result.atlas_sources_skipped == result.atlas_sources_created
    assert second_result.saved_searches_skipped == result.saved_searches_created
    assert len(list_source_atlas_entries(session)) == result.atlas_sources_created
    assert len(list_saved_search_queries(session)) == result.saved_searches_created


def test_washburn_source_pack_does_not_restore_archived_or_deleted_seed_items(session):
    entry = create_source_atlas_entry(session, atlas_payload())
    archive_source_atlas_entry(session, entry.id)
    query = create_saved_search_query(session, saved_query_payload())
    delete_saved_search_query(session, query.id)

    result = seed_washburn_source_pack(session)
    entries = list_source_atlas_entries(session)
    queries = list_saved_search_queries(session)

    assert result.atlas_sources_skipped >= 1
    assert result.saved_searches_skipped >= 1
    assert all(entry.url != "https://wusports.com/sports/football/roster" for entry in entries)
    assert all(query.query != '"Washburn University" "incoming freshman"' for query in queries)


def test_source_atlas_report_tracks_import_yield(session):
    entry = create_source_atlas_entry(session, atlas_payload())

    import_public_results(
        session,
        PublicResultsImportCreate(
            source_atlas_entry_id=entry.id,
            name="Football roster paste",
            url=entry.url,
            source_type=DiscoverySourceType.athletics_roster,
            source_platform="WUsports",
            public_access_confirmed=True,
            pasted_results="""
            Price Hamilton is a freshman at Washburn on the public football roster.
            Connor Flaherty is a redshirt freshman at Washburn on the public football roster.
            """,
            notes="Reviewer pasted public roster rows.",
        ),
    )
    candidate = next(
        lead for lead in list_candidate_leads(session) if lead.display_name == "Connor Flaherty"
    )
    update_candidate_status(
        session,
        candidate.id,
        CandidateReviewUpdate(
            status=CandidateStatus.removed,
            rejection_reason="Redshirt freshman outside current target pool.",
        ),
    )

    report = get_source_atlas_report(session)

    assert len(report) == 1
    assert report[0].source.id == entry.id
    assert report[0].import_count == 1
    assert report[0].total_candidates == 2
    assert report[0].usable_leads == 1
    assert report[0].last_imported_at is not None


def test_public_results_import_creates_review_candidates_from_pasted_text(session):
    query = create_saved_search_query(session, saved_query_payload())

    batch = import_public_results(
        session,
        PublicResultsImportCreate(
            saved_search_query_id=query.id,
            name="Manual Google result paste",
            url="https://www.google.com/search?q=Washburn+incoming+freshman",
            source_type=DiscoverySourceType.public_web_page,
            source_platform="Search",
            public_access_confirmed=True,
            pasted_results="""
            Noah Bennett announced he is an incoming freshman at Washburn University.
            Micah Reed committed to Washburn and posted about orientation week.
            """,
            notes="Reviewer pasted public result snippets.",
        ),
    )
    candidates = list_candidate_leads(session)

    assert batch.candidates_created == 2
    assert batch.saved_search_query_id == query.id
    assert {candidate.display_name for candidate in candidates} == {
        "Noah Bennett",
        "Micah Reed",
    }
    assert all(candidate.status == CandidateStatus.needs_review for candidate in candidates)


def test_public_results_import_requires_public_confirmation(session):
    with pytest.raises(ValueError, match="public access"):
        import_public_results(
            session,
            PublicResultsImportCreate(
                name="Unconfirmed paste",
                url="https://www.google.com/search?q=Washburn",
                source_type=DiscoverySourceType.public_web_page,
                source_platform="Search",
                public_access_confirmed=False,
                pasted_results="Jordan Hayes is an incoming freshman at Washburn University.",
            ),
        )


def test_discovery_run_extracts_review_candidates_from_public_evidence(session):
    source = create_discovery_source(session, source_payload())

    run = run_discovery(
        session,
        DiscoveryRunCreate(
            source_id=source.id,
            html_override="""
            <html><body>
              <p>Avery Cole is an incoming freshman at Washburn University and plays volleyball. Instagram @averycole.</p>
              <p>Jordan Hayes joined the orientation Discord and posted about move-in week.</p>
            </body></html>
            """,
        ),
    )
    candidates = list_candidate_leads(session)

    assert run.status == "completed"
    assert run.candidates_found == 2
    assert {candidate.display_name for candidate in candidates} == {
        "Avery Cole",
        "Jordan Hayes",
    }
    assert all(candidate.status == CandidateStatus.needs_review for candidate in candidates)
    assert any(candidate.handle == "@averycole" for candidate in candidates)


def test_candidate_duplicate_groups_use_handle_or_display_name(session):
    source = create_discovery_source(session, source_payload())
    for html in [
        "<p>Avery Cole is an incoming freshman at Washburn University. Instagram @averycole.</p>",
        "<p>Avery Cole posted about Washburn orientation week. Instagram @averycole.</p>",
        "<p>Jordan Hayes is an incoming freshman at Washburn University.</p>",
        "<p>Jordan Hayes joined Washburn move-in week.</p>",
    ]:
        run_discovery(session, DiscoveryRunCreate(source_id=source.id, html_override=html))

    groups = list_candidate_duplicate_groups(session)

    assert [(group.identity_key, group.count) for group in groups] == [
        ("handle:averycole", 2),
        ("name:jordan hayes", 2),
    ]
    assert groups[0].candidates[0].display_name == "Avery Cole"


def test_discovery_coverage_counts_unique_usable_leads(session):
    source = create_discovery_source(session, source_payload())
    for html in [
        "<p>Avery Cole is an incoming freshman at Washburn University. Instagram @averycole.</p>",
        "<p>Avery Cole posted about Washburn orientation week. Instagram @averycole.</p>",
        "<p>Noah Bennett announced he is an incoming freshman at Washburn University.</p>",
        "<p>Jordan Hayes is an incoming freshman at Washburn University.</p>",
    ]:
        run_discovery(session, DiscoveryRunCreate(source_id=source.id, html_override=html))
    candidates = list_candidate_leads(session)
    removed_candidate = next(
        candidate for candidate in candidates if candidate.display_name == "Jordan Hayes"
    )
    update_candidate_status(
        session,
        removed_candidate.id,
        CandidateReviewUpdate(
            status=CandidateStatus.removed,
            rejection_reason="Not fraternity-relevant after manual review.",
        ),
    )

    coverage = get_discovery_coverage(
        session,
        DiscoveryCoverageRequest(expected_male_pool=430),
    )

    assert coverage.total_candidates == 4
    assert coverage.unique_candidates == 3
    assert coverage.usable_leads == 2
    assert coverage.expected_male_pool == 430
    assert coverage.coverage_percent == 0.47


def test_discovery_excludes_sensitive_person_level_evidence(session):
    source = create_discovery_source(session, source_payload())

    run = run_discovery(
        session,
        DiscoveryRunCreate(
            source_id=source.id,
            html_override="""
            <p>Mason Rivera is an incoming freshman and wants to join orientation events.</p>
            <p>Avery Cole has a medical condition listed near a home address.</p>
            """,
        ),
    )
    candidates = list_candidate_leads(session)

    assert run.candidates_found == 1
    assert candidates[0].display_name == "Mason Rivera"
    assert "medical condition" not in candidates[0].evidence.lower()


def test_review_and_promote_candidate_creates_prospect(session):
    source = create_discovery_source(session, source_payload())
    run_discovery(
        session,
        DiscoveryRunCreate(
            source_id=source.id,
            html_override="<p>Avery Cole is an incoming freshman at Washburn University. Instagram @averycole.</p>",
        ),
    )
    candidate = list_candidate_leads(session)[0]

    reviewed = update_candidate_status(
        session,
        candidate.id,
        CandidateReviewUpdate(status=CandidateStatus.approved),
    )
    prospect = promote_candidate_to_prospect(session, reviewed.id)
    refreshed_candidate = get_candidate_lead(session, candidate.id)

    assert prospect.first_name == "Avery"
    assert prospect.last_name == "Cole"
    assert prospect.collection_method == CollectionMethod.assisted
    assert prospect.public_information_confirmed is True
    assert prospect.source_url == "https://example.edu/orientation"
    assert refreshed_candidate.status == CandidateStatus.promoted
    assert refreshed_candidate.promoted_prospect_id == prospect.id


def test_candidate_can_be_removed_after_initial_approval(session):
    source = create_discovery_source(session, source_payload())
    run_discovery(
        session,
        DiscoveryRunCreate(
            source_id=source.id,
            html_override="<p>Avery Cole is an incoming freshman at Washburn University. Instagram @averycole.</p>",
        ),
    )
    candidate = list_candidate_leads(session)[0]
    update_candidate_status(
        session,
        candidate.id,
        CandidateReviewUpdate(status=CandidateStatus.approved),
    )

    removed = update_candidate_status(
        session,
        candidate.id,
        CandidateReviewUpdate(
            status=CandidateStatus.removed,
            rejection_reason="Not fraternity-relevant after manual review.",
        ),
    )

    assert removed.status == CandidateStatus.removed
    assert removed.rejection_reason == "Not fraternity-relevant after manual review."


def test_promoted_prospect_can_be_removed_as_not_applicable(session):
    source = create_discovery_source(session, source_payload())
    run_discovery(
        session,
        DiscoveryRunCreate(
            source_id=source.id,
            html_override="<p>Jordan Hayes is an incoming freshman at Washburn University.</p>",
        ),
    )
    candidate = list_candidate_leads(session)[0]
    update_candidate_status(
        session,
        candidate.id,
        CandidateReviewUpdate(status=CandidateStatus.approved),
    )
    prospect = promote_candidate_to_prospect(session, candidate.id)

    removed = remove_prospect(
        session,
        prospect.id,
        RemovalCreate(reason="Determined N/A after chapter review."),
    )

    assert removed.status == "not_applicable"
    assert "Determined N/A after chapter review." in (removed.notes or "")
