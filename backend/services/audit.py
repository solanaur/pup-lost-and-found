from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.models import ActivityLog, Notification


def add_activity(
    db: Session,
    action: str,
    target_type: str = "",
    target_id: str = "",
    detail: str = "",
    actor_user_id: Optional[int] = None,
) -> None:
    row = ActivityLog(
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
        created_at=datetime.utcnow(),
    )
    db.add(row)


def add_notification(db: Session, user_id: int, title: str, message: str) -> None:
    row = Notification(
        user_id=user_id,
        title=title[:140],
        message=message,
        is_read=0,
        created_at=datetime.utcnow(),
    )
    db.add(row)
