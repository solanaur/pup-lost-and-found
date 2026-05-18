from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.deps import require_roles
from backend.models import Item, User
from backend.schemas import AIEnrichRequest, AIEnrichResponse, SmartMatchResponse
from backend.services.enrich import enrich_report
from backend.services.smart_match import smart_matches


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/enrich", response_model=AIEnrichResponse)
async def enrich(
    payload: AIEnrichRequest,
    _user: User = Depends(require_roles("student", "admin")),
):
    item_type = payload.type.strip().lower()
    if item_type not in {"lost", "found"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="type must be lost or found")
    out = await enrich_report(item_type, payload.name, payload.loc, payload.description)
    return AIEnrichResponse(**out)


@router.post("/smart-match", response_model=SmartMatchResponse)
def smart_match(
    payload: AIEnrichRequest,
    _user: User = Depends(require_roles("student", "admin")),
    db: Session = Depends(get_db),
):
    item_type = payload.type.strip().lower()
    if item_type not in {"lost", "found"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="type must be lost or found")

    opposite = "found" if item_type == "lost" else "lost"
    candidates = db.scalars(
        select(Item).where(Item.type == opposite, Item.status.in_(["approved", "claimed"])).order_by(Item.created_at.desc())
    ).all()
    matches = smart_matches(
        {"name": payload.name, "loc": payload.loc, "description": payload.description},
        candidates,
    )
    return SmartMatchResponse(matches=matches)
