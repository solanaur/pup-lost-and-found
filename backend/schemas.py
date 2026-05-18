from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AuthLoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=120)


class AuthSignupRequest(BaseModel):
    full_name: str = Field(min_length=3, max_length=120)
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=120)
    id_photo_data: str = Field(min_length=30)


class UserPublic(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    approval_status: str


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class MeResponse(BaseModel):
    user: Optional[UserPublic]


class ItemCreateRequest(BaseModel):
    type: str
    item_category: str = Field(default="General", max_length=80)
    color: str = Field(default="", max_length=60)
    building: str = Field(default="", max_length=40)
    floor: str = Field(default="", max_length=20)
    room: str = Field(default="", max_length=40)
    name: str = Field(min_length=1, max_length=200)
    loc: str = Field(min_length=1, max_length=300)
    description: str = Field(default="", max_length=2000)
    emoji: str = Field(default="", max_length=8)
    photo_data: str = Field(default="")


class ItemResponse(BaseModel):
    id: int
    code: str
    type: str
    item_category: str
    color: str
    building: str
    floor: str
    room: str
    name: str
    loc: str
    description: str
    emoji: str
    photo_data: str
    status: str
    date: str
    by: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(min_length=3, max_length=120)


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    date: str


class ActivityLogResponse(BaseModel):
    id: int
    action: str
    target_type: str
    target_id: str
    detail: str
    date: str


class AdminUserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    approval_status: str
    login_count: int
    last_login_at: str
    created_at: str


class AdminTrackerResponse(BaseModel):
    total_users: int
    pending_approvals: int
    approved_students: int
    total_items: int
    pending_items: int
    approvals_today: int


class AdminActionResponse(BaseModel):
    ok: bool


class AIEnrichRequest(BaseModel):
    type: str
    name: str = ""
    loc: str = ""
    description: str = ""


class AIEnrichResponse(BaseModel):
    source: str
    name: str
    loc: str
    description: str
    emoji: str


class SmartMatchItem(BaseModel):
    item_id: int
    score: float
    confidence: str
    reason: str
    type: str
    name: str
    loc: str
    description: str
    date: str


class SmartMatchResponse(BaseModel):
    matches: List[SmartMatchItem]


class ItemRowContext(BaseModel):
    id: int
    type: str
    name: str
    loc: str
    description: str
    emoji: str
    status: str
    created_at: datetime
    username: Optional[str]
