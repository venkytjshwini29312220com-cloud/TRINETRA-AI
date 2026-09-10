from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.graph.neo4j_client import Neo4jClient
from app.intelligence.evidence_ingestion import (
    EvidenceIngestionService,
)

from app.db.database import get_db
from app.models.evidence import Evidence
from app.schemas.evidence import (
    EvidenceCreate,
    EvidenceResponse,
    EvidenceUpdate,
)

import hashlib
import mimetypes
from pathlib import Path
from uuid import uuid4

from fastapi import File, Form, UploadFile
from app.models.evidence import Evidence, EvidenceStatus, EvidenceType


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/evidence",
    tags=["Evidence"],
)

UPLOAD_DIR = Path("data/evidence")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".tif",
    ".tiff",
    ".bmp",
}

# ============================================================
# CREATE EVIDENCE
# ============================================================

@router.post(
    "",
    response_model=EvidenceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_evidence(
    payload: EvidenceCreate,
    db: Session = Depends(get_db),
) -> Evidence:
    """
    Create a new evidence record.
    """

    data = payload.model_dump(
        exclude_unset=True
    )

    try:
        evidence = Evidence(
            **data
        )

        db.add(evidence)
        db.commit()
        db.refresh(evidence)

        return evidence

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create evidence: {str(exc)}",
        ) from exc


# ============================================================
# LIST EVIDENCE
# ============================================================

@router.get(
    "",
    response_model=list[EvidenceResponse],
)
def list_evidence(
    case_id: int | None = None,
    evidence_type: str | None = None,
    evidence_status: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[Evidence]:
    """
    Return a paginated list of evidence.

    Optional filters:
        - case_id
        - evidence_type
        - evidence_status
    """

    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="skip cannot be negative.",
        )

    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 500.",
        )

    if case_id is not None and case_id < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="case_id must be greater than 0.",
        )

    query = db.query(Evidence)

    # --------------------------------------------------------
    # CASE FILTER
    # --------------------------------------------------------

    if case_id is not None:
        query = query.filter(
            Evidence.case_id == case_id
        )

    # --------------------------------------------------------
    # TYPE FILTER
    # --------------------------------------------------------

    if evidence_type:
        query = query.filter(
            Evidence.evidence_type
            == evidence_type.strip().lower()
        )

    # --------------------------------------------------------
    # STATUS FILTER
    # --------------------------------------------------------

    if evidence_status:
        query = query.filter(
            Evidence.status
            == evidence_status.strip().lower()
        )

    return (
        query
        .order_by(
            Evidence.id.desc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


# ============================================================
# GET EVIDENCE
# ============================================================

@router.get(
    "/{evidence_id}",
    response_model=EvidenceResponse,
)
def get_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
) -> Evidence:
    """
    Retrieve a single evidence record by ID.
    """

    if evidence_id < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="evidence_id must be greater than 0.",
        )

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found.",
        )

    return evidence

@router.post("/upload", status_code=201)
async def upload_evidence(
    case_id: int = Form(...),
    evidence_number: str = Form(...),
    title: str = Form(...),
    evidence_type: str = Form("document"),
    description: str | None = Form(None),
    source_type: str | None = Form(None),
    source_reference: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a document/image, extract its text, create an Evidence record,
    and run the existing evidence NLP ingestion pipeline.
    """

    # ---------------------------------------------------------
    # Validate filename
    # ---------------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must have a filename.",
        )

    original_name = Path(file.filename).name
    extension = Path(original_name).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: {extension}. "
                f"Allowed types: {sorted(ALLOWED_EXTENSIONS)}"
            ),
        )

    # ---------------------------------------------------------
    # Read uploaded file
    # ---------------------------------------------------------

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    # ---------------------------------------------------------
    # Calculate SHA-256
    # ---------------------------------------------------------

    file_hash = hashlib.sha256(contents).hexdigest()

    # ---------------------------------------------------------
    # Create unique stored filename
    # ---------------------------------------------------------

    stored_name = f"{uuid4().hex}{extension}"
    stored_path = UPLOAD_DIR / stored_name

    stored_path.write_bytes(contents)

    # ---------------------------------------------------------
    # Determine MIME type
    # ---------------------------------------------------------

    mime_type = file.content_type

    if not mime_type:
        mime_type, _ = mimetypes.guess_type(original_name)

    if not mime_type:
        mime_type = "application/octet-stream"

    # ---------------------------------------------------------
    # Extract document text
    # ---------------------------------------------------------

    from app.document.extractor import DocumentExtractor

    extractor = DocumentExtractor()

    try:
        extraction = extractor.extract(stored_path)
    except Exception as exc:
        stored_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=422,
            detail=f"Document extraction failed: {exc}",
        ) from exc

    if not extraction.extracted_text.strip():
        stored_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=422,
            detail=(
                "No text could be extracted from the uploaded file."
            ),
        )

    # ---------------------------------------------------------
    # Create Evidence record
    # ---------------------------------------------------------

    evidence = Evidence(
        case_id=case_id,
        evidence_number=evidence_number,
        title=title,
        description=description,
        evidence_type=EvidenceType(evidence_type),
        status=EvidenceStatus.RECEIVED,
        source_type=source_type,
        source_reference=source_reference,
        source_file=str(stored_path),
        file_name=original_name,
        file_path=str(stored_path),
        file_hash=file_hash,
        mime_type=mime_type,
        file_size=len(contents),
        extracted_text=extraction.extracted_text,
        extraction_confidence=extraction.extraction_confidence,
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    # ---------------------------------------------------------
    # Run existing NLP + graph ingestion
    # ---------------------------------------------------------

    neo4j_client = Neo4jClient(
        uri=settings.neo4j_uri,
        username=settings.neo4j_username,
        password=settings.neo4j_password,
        database=settings.neo4j_database,
    )

    try:
        service = EvidenceIngestionService(
            session=db,
            neo4j_client=neo4j_client,
        )

        result = service.ingest_evidence(
            evidence_id=evidence.id,
        )

        return {
            "success": True,
            "message": "Evidence uploaded and ingested successfully.",
            "evidence": {
                "id": evidence.id,
                "evidence_number": evidence.evidence_number,
                "title": evidence.title,
                "evidence_type": (
                    evidence.evidence_type.value
                    if hasattr(evidence.evidence_type, "value")
                    else str(evidence.evidence_type)
                ),
                "status": (
                    evidence.status.value
                    if hasattr(evidence.status, "value")
                    else str(evidence.status)
                ),
                "file_name": evidence.file_name,
                "file_path": evidence.file_path,
                "file_hash": evidence.file_hash,
                "mime_type": evidence.mime_type,
                "file_size": evidence.file_size,
                "extraction_confidence": (
                    evidence.extraction_confidence
                ),
            },
            "extraction": extraction.to_dict(),
            "ingestion": result.to_dict(),
        }

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Evidence ingestion failed: {exc}",
        ) from exc

    finally:
        neo4j_client.close()

# ============================================================
# INGEST EVIDENCE INTO INTELLIGENCE GRAPH
# ============================================================

@router.post(
    "/{evidence_id}/ingest",
)
def ingest_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
):
    """
    Run NLP extraction against evidence and persist the
    resulting intelligence into SQL and Neo4j.
    """

    if evidence_id < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="evidence_id must be greater than 0.",
        )

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found.",
        )

    if not evidence.extracted_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Evidence does not contain extracted_text."
            ),
        )

    neo4j_client = None

    try:
        neo4j_client = Neo4jClient(
            uri=settings.neo4j_uri,
            username=settings.neo4j_username,
            password=settings.neo4j_password,
            database=settings.neo4j_database,
        )

        service = EvidenceIngestionService(
            session=db,
            neo4j_client=neo4j_client,
        )

        result = service.ingest_evidence(
            evidence_id=evidence_id,
        )

        return {
            "success": True,
            "message": (
                "Evidence ingested successfully."
            ),
            "result": result.to_dict(),
        }

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                f"Evidence ingestion failed: {str(exc)}"
            ),
        ) from exc

    finally:
        if neo4j_client is not None:
            try:
                neo4j_client.close()
            except Exception:
                pass


# ============================================================
# SEARCH EVIDENCE
# ============================================================

@router.get(
    "/search/",
    response_model=list[EvidenceResponse],
)
def search_evidence(
    q: str,
    case_id: int | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> list[Evidence]:
    """
    Search evidence by:

        - evidence number
        - title
        - description
        - source reference
        - file name
        - extracted text
    """

    q = q.strip()

    if not q:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty.",
        )

    if len(q) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query is too long.",
        )

    if limit < 1 or limit > 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 200.",
        )

    if case_id is not None and case_id < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="case_id must be greater than 0.",
        )

    search_term = f"%{q}%"

    query = db.query(Evidence).filter(
        or_(
            Evidence.evidence_number.ilike(
                search_term
            ),
            Evidence.title.ilike(
                search_term
            ),
            Evidence.description.ilike(
                search_term
            ),
            Evidence.source_reference.ilike(
                search_term
            ),
            Evidence.file_name.ilike(
                search_term
            ),
            Evidence.extracted_text.ilike(
                search_term
            ),
        )
    )

    if case_id is not None:
        query = query.filter(
            Evidence.case_id == case_id
        )

    return (
        query
        .order_by(
            Evidence.id.desc()
        )
        .limit(limit)
        .all()
    )


# ============================================================
# UPDATE EVIDENCE
# ============================================================

@router.patch(
    "/{evidence_id}",
    response_model=EvidenceResponse,
)
def update_evidence(
    evidence_id: int,
    payload: EvidenceUpdate,
    db: Session = Depends(get_db),
) -> Evidence:
    """
    Partially update an evidence record.

    Only fields supplied in the PATCH request
    are changed.
    """

    if evidence_id < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="evidence_id must be greater than 0.",
        )

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found.",
        )

    updates = payload.model_dump(
        exclude_unset=True
    )

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update.",
        )

    # --------------------------------------------------------
    # ONLY UPDATE REAL DATABASE COLUMNS
    # --------------------------------------------------------

    evidence_columns = {
        column.name
        for column in Evidence.__table__.columns
    }

    invalid_fields = [
        field
        for field in updates
        if field not in evidence_columns
    ]

    if invalid_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Invalid evidence field(s).",
                "fields": invalid_fields,
            },
        )

    try:

        for field_name, value in updates.items():
            setattr(
                evidence,
                field_name,
                value,
            )

        db.commit()
        db.refresh(evidence)

        return evidence

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update evidence: {str(exc)}",
        ) from exc


# ============================================================
# DELETE EVIDENCE
# ============================================================

@router.delete(
    "/{evidence_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
) -> None:
    """
    Delete an evidence record.
    """

    if evidence_id < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="evidence_id must be greater than 0.",
        )

    evidence = (
        db.query(Evidence)
        .filter(
            Evidence.id == evidence_id
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found.",
        )

    try:

        db.delete(evidence)
        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete evidence: {str(exc)}",
        ) from exc

    return None