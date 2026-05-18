from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from backend.database import get_db
from backend.deps import get_optional_user, require_roles
from backend.models import Item, User
from backend.schemas import ItemCreateRequest, ItemResponse
from backend.services.audit import add_activity, add_notification


router = APIRouter(prefix="/items", tags=["items"])


def _fmt_date(dt) -> str:
    return dt.strftime("%b %-d") if dt else ""


def _item_to_response(item: Item, include_submitter: bool) -> ItemResponse:
    by = item.submitter.username if include_submitter and item.submitter else None
    return ItemResponse(
        id=item.id,
        code=item.code,
        type=item.type,
        item_category=item.item_category or "General",
        color=item.color or "",
        building=item.building or "",
        floor=item.floor or "",
        room=item.room or "",
        name=item.name,
        loc=item.loc,
        description=item.description or "",
        emoji=item.emoji or "",
        photo_data=item.photo_data or "",
        status=item.status,
        date=_fmt_date(item.created_at),
        by=by,
    )


@router.get("", response_model=list[ItemResponse])
def list_public_items(
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(Item)
        .options(joinedload(Item.submitter))
        .where(Item.status.in_(["approved", "claimed"]))
        .order_by(Item.created_at.desc())
    ).all()
    show_submitter = bool(user and user.role == "admin")
    return [_item_to_response(row, show_submitter) for row in rows]


@router.get("/mine", response_model=list[ItemResponse])
def list_my_pending_items(
    user: User = Depends(require_roles("student", "admin")),
    db: Session = Depends(get_db),
):
    if user.role == "admin":
        return []
    rows = db.scalars(
        select(Item)
        .options(joinedload(Item.submitter))
        .where(Item.submitted_by == user.id, Item.status == "pending")
        .order_by(Item.created_at.desc())
    ).all()
    return [_item_to_response(row, True) for row in rows]


@router.get("/pending", response_model=list[ItemResponse])
def list_pending_items(
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(Item).options(joinedload(Item.submitter)).where(Item.status == "pending").order_by(Item.created_at.desc())
    ).all()
    return [_item_to_response(row, True) for row in rows]


@router.get("/live", response_model=list[ItemResponse])
def list_live_items(
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(Item)
        .options(joinedload(Item.submitter))
        .where(Item.status.in_(["approved", "claimed"]))
        .order_by(Item.created_at.desc())
    ).all()
    return [_item_to_response(row, True) for row in rows]


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: ItemCreateRequest,
    user: User = Depends(require_roles("student")),
    db: Session = Depends(get_db),
):
    item_type = payload.type.strip().lower()
    if item_type not in {"lost", "found"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="type must be lost or found")

    row = Item(
        type=item_type,
        item_category=(payload.item_category or "General").strip()[:80],
        color=(payload.color or "").strip()[:60],
        building=(payload.building or "").strip()[:40],
        floor=(payload.floor or "").strip()[:20],
        room=(payload.room or "").strip()[:40],
        name=payload.name.strip()[:200],
        loc=payload.loc.strip()[:300],
        description=(payload.description or "").strip()[:2000],
        emoji=(payload.emoji or "").strip()[:8],
        photo_data=(payload.photo_data or "")[:4_000_000],
        status="pending",
        submitted_by=user.id,
    )
    db.add(row)
    db.flush()
    row.code = f"PUPLF-{row.id:06d}"
    add_activity(
        db,
        action="item_reported",
        target_type="item",
        target_id=str(row.id),
        detail=f"{row.code} submitted",
        actor_user_id=user.id,
    )
    db.commit()
    db.refresh(row)
    row = db.scalar(select(Item).options(joinedload(Item.submitter)).where(Item.id == row.id))
    return _item_to_response(row, True)


def _set_status(item_id: int, from_statuses: list[str], to_status: str, db: Session) -> None:
    row = db.get(Item, item_id)
    if not row or row.status not in from_statuses:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found or invalid status")
    row.status = to_status
    db.add(row)
    db.commit()


@router.patch("/{item_id}/approve")
def approve_item(item_id: int, _user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    _set_status(item_id, ["pending"], "approved", db)
    row = db.get(Item, item_id)
    if row:
        add_notification(db, row.submitted_by, "Item approved", f"Your report {row.code} is now live on the board.")
        add_activity(db, action="item_approved", target_type="item", target_id=str(item_id), detail=row.code)
        db.commit()
    return {"ok": True}


@router.patch("/{item_id}/reject")
def reject_item(item_id: int, _user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    _set_status(item_id, ["pending"], "rejected", db)
    row = db.get(Item, item_id)
    if row:
        add_notification(db, row.submitted_by, "Item rejected", f"Your report {row.code} was rejected by admin.")
        add_activity(db, action="item_rejected", target_type="item", target_id=str(item_id), detail=row.code)
        db.commit()
    return {"ok": True}


@router.patch("/{item_id}/claim")
def claim_item(item_id: int, _user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    _set_status(item_id, ["approved"], "claimed", db)
    row = db.get(Item, item_id)
    if row:
        add_notification(db, row.submitted_by, "Item marked claimed", f"Report {row.code} is now marked as claimed.")
        add_activity(db, action="item_claimed", target_type="item", target_id=str(item_id), detail=row.code)
        db.commit()
    return {"ok": True}


@router.get("/admin/tracker")
def admin_tracker(_user: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    from datetime import datetime

    today = datetime.utcnow().date()
    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    pending_approvals = db.scalar(select(func.count()).select_from(User).where(User.approval_status == "pending")) or 0
    approved_students = (
        db.scalar(select(func.count()).select_from(User).where(User.role == "student", User.approval_status == "approved")) or 0
    )
    total_items = db.scalar(select(func.count()).select_from(Item)) or 0
    pending_items = db.scalar(select(func.count()).select_from(Item).where(Item.status == "pending")) or 0
    approvals_today = (
        db.scalar(
            select(func.count()).select_from(Item).where(Item.status == "approved", func.date(Item.created_at) == str(today))
        )
        or 0
    )
    return {
        "total_users": int(total_users),
        "pending_approvals": int(pending_approvals),
        "approved_students": int(approved_students),
        "total_items": int(total_items),
        "pending_items": int(pending_items),
        "approvals_today": int(approvals_today),
    }
