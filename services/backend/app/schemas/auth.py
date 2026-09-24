from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.tenant import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    specialty: Optional[str] = "Клинический психолог"
    role: UserRole = UserRole.SPECIALIST


class UserCreate(UserBase):
    password: str
    tenant_name: Optional[str] = "Частная практика"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut
