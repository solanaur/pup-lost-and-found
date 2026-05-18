from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.deps import get_current_user, get_optional_user, require_roles
from backend.models import User
from backend.schemas import (
    AdminActionResponse,
    AuthLoginRequest,
    AuthResponse,
    AuthSignupRequest,
    MeResponse,
    ProfileUpdateRequest,
    UserPublic,
)
from backend.security import create_access_token, hash_password, verify_password
from backend.services.audit import add_activity, add_notification


router = APIRouter(prefix="/auth", tags=["auth"])


def _user_public(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        approval_status=user.approval_status,
    )


@router.post("/signup")
def signup(payload: AuthSignupRequest, db: Session = Depends(get_db)):
    username = payload.username.strip()
    exists = db.scalar(select(User).where(User.username == username))
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    user = User(
        username=username,
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role="student",
        approval_status="pending",
        id_photo_data=payload.id_photo_data,
    )
    db.add(user)
    add_activity(db, action="signup_submitted", target_type="user", target_id=username, detail="Awaiting admin approval")
    db.commit()
    return {
        "ok": True,
        "message": "Signup submitted. Wait for admin approval before logging in.",
    }


@router.post("/login", response_model=AuthResponse)
def login(payload: AuthLoginRequest, db: Session = Depends(get_db)):
    username = payload.username.strip()
    user = db.scalar(select(User).where(User.username == username))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.approval_status != "approved":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account pending admin approval")

    token = create_access_token(str(user.id), user.username, user.role)
    user.login_count = int(user.login_count or 0) + 1
    from datetime import datetime

    user.last_login_at = datetime.utcnow()
    add_activity(db, action="login", target_type="user", target_id=str(user.id), actor_user_id=user.id)
    db.add(user)
    db.commit()
    return AuthResponse(token=token, user=_user_public(user))


@router.get("/me", response_model=MeResponse)
def me(user: Optional[User] = Depends(get_optional_user)):
    if not user:
        return MeResponse(user=None)
    return MeResponse(user=_user_public(user))


@router.patch("/profile", response_model=UserPublic)
def update_profile(
    payload: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.full_name = payload.full_name.strip()
    db.add(user)
    add_activity(db, action="profile_updated", target_type="user", target_id=str(user.id), actor_user_id=user.id)
    db.commit()
    db.refresh(user)
    return _user_public(user)


@router.get("/pending-users")
def pending_users(_admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    rows = db.scalars(select(User).where(User.approval_status == "pending").order_by(User.created_at.desc())).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "id_photo_data": u.id_photo_data,
            "date": u.created_at.strftime("%b %d"),
        }
        for u in rows
    ]


@router.patch("/users/{user_id}/approve", response_model=AdminActionResponse)
def approve_user(user_id: int, admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or user.approval_status != "pending":
        raise HTTPException(status_code=404, detail="User not found or already reviewed")
    user.approval_status = "approved"
    db.add(user)
    add_activity(db, action="user_approved", target_type="user", target_id=str(user_id), actor_user_id=admin.id)
    add_notification(db, user.id, "Account approved", "Your account is now approved. You may log in.")
    db.commit()
    return AdminActionResponse(ok=True)


@router.patch("/users/{user_id}/reject", response_model=AdminActionResponse)
def reject_user(user_id: int, admin: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or user.approval_status != "pending":
        raise HTTPException(status_code=404, detail="User not found or already reviewed")
    user.approval_status = "rejected"
    db.add(user)
    add_activity(db, action="user_rejected", target_type="user", target_id=str(user_id), actor_user_id=admin.id)
    add_notification(
        db,
        user.id,
        "Account requires re-submission",
        "Your signup request was rejected. Please contact admin with a valid school ID.",
    )
    db.commit()
    return AdminActionResponse(ok=True)
