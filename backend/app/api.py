from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
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
    RemovalCreate,
    StatusUpdate,
    SuppressionCreate,
    SuppressionRead,
)
from app.services import (
    add_follow_up,
    add_note,
    create_intake_lead,
    create_prospect,
    get_intake_metrics,
    import_intake_csv,
    list_intake_duplicate_groups,
    list_intake_leads,
    list_prospects,
    promote_intake_lead_to_prospect,
    remove_prospect,
    suppress_identity,
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
