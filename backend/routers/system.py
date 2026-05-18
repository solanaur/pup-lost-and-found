from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.deps import get_current_user, require_roles
from backend.models import ActivityLog, Notification, User


router = APIRouter(prefix="/system", tags=["system"])


@router.get("/notifications")
def notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "message": r.message,
            "is_read": bool(r.is_read),
            "date": r.created_at.strftime("%b %d, %I:%M %p"),
        }
        for r in rows
    ]


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.get(Notification, notification_id)
    if row and row.user_id == user.id:
        row.is_read = 1
        db.add(row)
        db.commit()
    return {"ok": True}


@router.get("/admin/activity")
def admin_activity(_admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    rows = db.scalars(select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(200)).all()
    return [
        {
            "id": r.id,
            "action": r.action,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "detail": r.detail,
            "date": r.created_at.strftime("%b %d, %I:%M %p"),
        }
        for r in rows
    ]


@router.get("/admin/users")
def admin_users(_admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    rows = db.scalars(select(User).order_by(User.created_at.desc())).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role,
            "approval_status": u.approval_status,
            "login_count": int(u.login_count or 0),
            "last_login_at": u.last_login_at.strftime("%b %d, %I:%M %p") if u.last_login_at else "-",
            "created_at": u.created_at.strftime("%b %d, %I:%M %p"),
        }
        for u in rows
    ]
