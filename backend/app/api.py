from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    CandidateDuplicateGroup,
    CandidateLeadRead,
    CandidateReviewUpdate,
    DiscoveryCoverageRead,
    DiscoveryCoverageRequest,
    DiscoveryRunCreate,
    DiscoveryRunRead,
    DiscoverySourceCreate,
    DiscoverySourceRead,
    FollowUpCreate,
    FollowUpRead,
    IntakeCsvImportCreate,
    IntakeCsvImportResult,
    IntakeDuplicateGroup,
    IntakeLeadCreate,
    IntakeLeadRead,
    IntakeLeadReviewUpdate,
    IntakeMetricsRead,
    NoteCreate,
    NoteRead,
    ProspectCreate,
    ProspectRead,
    PublicResultsImportCreate,
    RemovalCreate,
    SavedSearchQueryCreate,
    SavedSearchQueryRead,
    SourceAtlasCreate,
    SourceAtlasRead,
    SourceAtlasReportItem,
    SourceSetupResult,
    SourceImportBatchRead,
    StatusUpdate,
    SuppressionCreate,
    SuppressionRead,
)
from app.services import (
    add_follow_up,
    add_note,
    archive_source_atlas_entry,
    create_intake_lead,
    create_prospect,
    create_discovery_source,
    create_saved_search_query,
    create_source_atlas_entry,
    delete_saved_search_query,
    get_discovery_coverage,
    get_candidate_lead,
    get_intake_metrics,
    get_source_atlas_report,
    import_intake_csv,
    import_public_results,
    list_candidate_duplicate_groups,
    list_candidate_leads,
    list_discovery_runs,
    list_discovery_sources,
    list_intake_duplicate_groups,
    list_intake_leads,
    list_prospects,
    list_saved_search_queries,
    list_source_atlas_entries,
    promote_intake_lead_to_prospect,
    promote_candidate_to_prospect,
    remove_prospect,
    run_discovery,
    seed_washburn_source_pack,
    suppress_identity,
    update_candidate_status,
    update_intake_lead_status,
    update_prospect_status,
)

router = APIRouter()


def bad_request(error: ValueError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


def not_found(error: LookupError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "rushintel-api"}


@router.post(
    "/prospects",
    response_model=ProspectRead,
    status_code=status.HTTP_201_CREATED,
)
def create_prospect_endpoint(
    payload: ProspectCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_prospect(db, payload)
    except ValueError as error:
        raise bad_request(error) from error


@router.get("/prospects", response_model=list[ProspectRead])
def list_prospects_endpoint(db: Session = Depends(get_db)):
    return list_prospects(db)


@router.patch("/prospects/{prospect_id}/status", response_model=ProspectRead)
def update_prospect_status_endpoint(
    prospect_id: str,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
):
    try:
        return update_prospect_status(db, prospect_id, payload.status)
    except LookupError as error:
        raise not_found(error) from error


@router.post("/prospects/{prospect_id}/remove", response_model=ProspectRead)
def remove_prospect_endpoint(
    prospect_id: str,
    payload: RemovalCreate,
    db: Session = Depends(get_db),
):
    try:
        return remove_prospect(db, prospect_id, payload)
    except LookupError as error:
        raise not_found(error) from error


@router.post(
    "/prospects/{prospect_id}/notes",
    response_model=NoteRead,
    status_code=status.HTTP_201_CREATED,
)
def add_note_endpoint(
    prospect_id: str,
    payload: NoteCreate,
    db: Session = Depends(get_db),
):
    try:
        return add_note(db, prospect_id, payload)
    except LookupError as error:
        raise not_found(error) from error


@router.post(
    "/prospects/{prospect_id}/follow-ups",
    response_model=FollowUpRead,
    status_code=status.HTTP_201_CREATED,
)
def add_follow_up_endpoint(
    prospect_id: str,
    payload: FollowUpCreate,
    db: Session = Depends(get_db),
):
    try:
        return add_follow_up(db, prospect_id, payload)
    except LookupError as error:
        raise not_found(error) from error


@router.post(
    "/suppressions",
    response_model=SuppressionRead,
    status_code=status.HTTP_201_CREATED,
)
def suppress_identity_endpoint(
    payload: SuppressionCreate,
    db: Session = Depends(get_db),
):
    return suppress_identity(db, payload)


@router.post(
    "/intake-leads",
    response_model=IntakeLeadRead,
    status_code=status.HTTP_201_CREATED,
)
def create_intake_lead_endpoint(
    payload: IntakeLeadCreate,
    db: Session = Depends(get_db),
):
    return create_intake_lead(db, payload)


@router.get("/intake-leads", response_model=list[IntakeLeadRead])
def list_intake_leads_endpoint(db: Session = Depends(get_db)):
    return list_intake_leads(db)


@router.patch("/intake-leads/{lead_id}", response_model=IntakeLeadRead)
def update_intake_lead_status_endpoint(
    lead_id: str,
    payload: IntakeLeadReviewUpdate,
    db: Session = Depends(get_db),
):
    try:
        return update_intake_lead_status(db, lead_id, payload)
    except LookupError as error:
        raise not_found(error) from error
    except ValueError as error:
        raise bad_request(error) from error


@router.post(
    "/intake-leads/{lead_id}/promote",
    response_model=ProspectRead,
    status_code=status.HTTP_201_CREATED,
)
def promote_intake_lead_endpoint(
    lead_id: str,
    db: Session = Depends(get_db),
):
    try:
        return promote_intake_lead_to_prospect(db, lead_id)
    except LookupError as error:
        raise not_found(error) from error
    except ValueError as error:
        raise bad_request(error) from error


@router.post(
    "/intake-imports/csv",
    response_model=IntakeCsvImportResult,
    status_code=status.HTTP_201_CREATED,
)
def import_intake_csv_endpoint(
    payload: IntakeCsvImportCreate,
    db: Session = Depends(get_db),
):
    return import_intake_csv(db, payload)


@router.get("/intake-duplicates", response_model=list[IntakeDuplicateGroup])
def list_intake_duplicate_groups_endpoint(db: Session = Depends(get_db)):
    return list_intake_duplicate_groups(db)


@router.get("/intake-metrics", response_model=IntakeMetricsRead)
def get_intake_metrics_endpoint(db: Session = Depends(get_db)):
    return get_intake_metrics(db)


@router.post(
    "/discovery-sources",
    response_model=DiscoverySourceRead,
    status_code=status.HTTP_201_CREATED,
)
def create_discovery_source_endpoint(
    payload: DiscoverySourceCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_discovery_source(db, payload)
    except ValueError as error:
        raise bad_request(error) from error


@router.get("/discovery-sources", response_model=list[DiscoverySourceRead])
def list_discovery_sources_endpoint(db: Session = Depends(get_db)):
    return list_discovery_sources(db)


@router.post(
    "/saved-search-queries",
    response_model=SavedSearchQueryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_saved_search_query_endpoint(
    payload: SavedSearchQueryCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_saved_search_query(db, payload)
    except ValueError as error:
        raise bad_request(error) from error


@router.get("/saved-search-queries", response_model=list[SavedSearchQueryRead])
def list_saved_search_queries_endpoint(db: Session = Depends(get_db)):
    return list_saved_search_queries(db)


@router.delete("/saved-search-queries/{query_id}", response_model=SavedSearchQueryRead)
def delete_saved_search_query_endpoint(
    query_id: str,
    db: Session = Depends(get_db),
):
    try:
        return delete_saved_search_query(db, query_id)
    except LookupError as error:
        raise not_found(error) from error


@router.post(
    "/source-atlas",
    response_model=SourceAtlasRead,
    status_code=status.HTTP_201_CREATED,
)
def create_source_atlas_entry_endpoint(
    payload: SourceAtlasCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_source_atlas_entry(db, payload)
    except ValueError as error:
        raise bad_request(error) from error


@router.get("/source-atlas", response_model=list[SourceAtlasRead])
def list_source_atlas_entries_endpoint(db: Session = Depends(get_db)):
    return list_source_atlas_entries(db)


@router.delete("/source-atlas/{entry_id}", response_model=SourceAtlasRead)
def archive_source_atlas_entry_endpoint(
    entry_id: str,
    db: Session = Depends(get_db),
):
    try:
        return archive_source_atlas_entry(db, entry_id)
    except LookupError as error:
        raise not_found(error) from error


@router.get("/source-atlas/report", response_model=list[SourceAtlasReportItem])
def get_source_atlas_report_endpoint(db: Session = Depends(get_db)):
    return get_source_atlas_report(db)


@router.post("/source-setup/washburn", response_model=SourceSetupResult)
def seed_washburn_source_pack_endpoint(db: Session = Depends(get_db)):
    return seed_washburn_source_pack(db)


@router.post(
    "/discovery-runs",
    response_model=DiscoveryRunRead,
    status_code=status.HTTP_201_CREATED,
)
def run_discovery_endpoint(
    payload: DiscoveryRunCreate,
    db: Session = Depends(get_db),
):
    try:
        return run_discovery(db, payload)
    except LookupError as error:
        raise not_found(error) from error
    except ValueError as error:
        raise bad_request(error) from error


@router.get("/discovery-runs", response_model=list[DiscoveryRunRead])
def list_discovery_runs_endpoint(db: Session = Depends(get_db)):
    return list_discovery_runs(db)


@router.post(
    "/source-imports",
    response_model=SourceImportBatchRead,
    status_code=status.HTTP_201_CREATED,
)
def import_public_results_endpoint(
    payload: PublicResultsImportCreate,
    db: Session = Depends(get_db),
):
    try:
        return import_public_results(db, payload)
    except LookupError as error:
        raise not_found(error) from error
    except ValueError as error:
        raise bad_request(error) from error


@router.get("/candidate-leads", response_model=list[CandidateLeadRead])
def list_candidate_leads_endpoint(db: Session = Depends(get_db)):
    return list_candidate_leads(db)


@router.get("/candidate-duplicates", response_model=list[CandidateDuplicateGroup])
def list_candidate_duplicate_groups_endpoint(db: Session = Depends(get_db)):
    return list_candidate_duplicate_groups(db)


@router.get("/discovery-coverage", response_model=DiscoveryCoverageRead)
def get_discovery_coverage_endpoint(
    expected_male_pool: int = Query(default=430, ge=1, le=100_000),
    db: Session = Depends(get_db),
):
    return get_discovery_coverage(
        db,
        DiscoveryCoverageRequest(expected_male_pool=expected_male_pool),
    )


@router.get("/candidate-leads/{candidate_id}", response_model=CandidateLeadRead)
def get_candidate_lead_endpoint(
    candidate_id: str,
    db: Session = Depends(get_db),
):
    try:
        return get_candidate_lead(db, candidate_id)
    except LookupError as error:
        raise not_found(error) from error


@router.patch("/candidate-leads/{candidate_id}", response_model=CandidateLeadRead)
def update_candidate_status_endpoint(
    candidate_id: str,
    payload: CandidateReviewUpdate,
    db: Session = Depends(get_db),
):
    try:
        return update_candidate_status(db, candidate_id, payload)
    except LookupError as error:
        raise not_found(error) from error
    except ValueError as error:
        raise bad_request(error) from error


@router.post(
    "/candidate-leads/{candidate_id}/promote",
    response_model=ProspectRead,
    status_code=status.HTTP_201_CREATED,
)
def promote_candidate_endpoint(
    candidate_id: str,
    db: Session = Depends(get_db),
):
    try:
        return promote_candidate_to_prospect(db, candidate_id)
    except LookupError as error:
        raise not_found(error) from error
    except ValueError as error:
        raise bad_request(error) from error
